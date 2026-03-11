import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import httpx
from app.models.enrichment import *

# AnswerCoalesce endpoints
AC_BASE_URL = "https://answercoalesce-test.apps.renci.org"
AC_QUERY_ASYNC = f"{AC_BASE_URL}/query/async"
AC_QUERY_STATUS = f"{AC_BASE_URL}/query/status"
AC_QUERY_RESULT = f"{AC_BASE_URL}/query/result"

# Polling configuration
MAX_WAIT_SECONDS = 1800  # 15 minutes max wait
POLL_INTERVAL_SECONDS = 3  # Poll every 3 seconds


class Job:
    def __init__(self, job_id: str, user_id: str, request: EnrichmentAnalysisRequest):
        self.id = job_id
        self.user_id = user_id
        self.request = request
        self.status = JobStatus.QUEUED
        self.progress = 0
        self.message = "Job queued"
        self.created_at = datetime.now()
        self.completed_at = None
        self.logs = []  # Store AC logs if available
        self.ac_job_id = None  # Track the AnswerCoalesce job ID


class EnrichmentService:
    """
    EDGAR enrichment service.
    Forwards TRAPI queries to AnswerCoalesce async endpoints and polls for results.
    """
    
    def __init__(self):
        self.jobs = {}
        self.results = {}
    
    async def validate_request(self, request: EnrichmentAnalysisRequest):
        """Validate TRAPI query structure"""
        if not request.message.query_graph:
            raise ValueError("Query graph is required")
        if not request.message.query_graph.nodes:
            raise ValueError("Query graph must have nodes")
        if not request.message.query_graph.edges:
            raise ValueError("Query graph must have edges")
        return True
    
    async def create_job(self, user_id: str, request: EnrichmentAnalysisRequest) -> Job:
        """Create a new enrichment analysis job"""
        job_id = str(uuid.uuid4())
        job = Job(job_id, user_id, request)
        self.jobs[job_id] = job
        return job
    
    async def run_analysis(self, job_id: str):
        """
        Run enrichment analysis using AnswerCoalesce async endpoints:
        1. Submit to /query/async - returns immediately with ac_job_id
        2. Poll /query/status/{ac_job_id} until complete
        3. Fetch /query/result/{ac_job_id} for full response
        """
        print(f"\n\n>>> RUN_ANALYSIS CALLED FOR {job_id}\n\n")
        
        job = self.jobs.get(job_id)
        if not job:
            print(f">>> ERROR: Job {job_id} not found in self.jobs!")
            return
        
        try:
            job.status = JobStatus.RUNNING
            job.progress = 5
            job.message = "Preparing query..."
            
            request_data = job.request.dict()
            
            # ============================================================
            # STEP 1: Submit query to AnswerCoalesce async endpoint
            # ============================================================
            job.progress = 10
            job.message = "Submitting query to AnswerCoalesce..."
            print(f">>> Submitting to {AC_QUERY_ASYNC}") 
            
            async with httpx.AsyncClient(timeout=600.0) as client:
                try:
                    response = await client.post(AC_QUERY_ASYNC, json=request_data)
                except httpx.ConnectError as e:
                    job.status = JobStatus.FAILED
                    job.message = "Could not connect to AnswerCoalesce. The service may be down."
                    job.progress = 100
                    print(f">>> Connection error: {e}")
                    return
                except httpx.TimeoutException:
                    job.status = JobStatus.FAILED
                    job.message = "Connection to AnswerCoalesce timed out."
                    job.progress = 100
                    print(f">>> Timeout connecting to AC")
                    return
                
                print(f">>> Submit response status: {response.status_code}")
                
                if response.status_code != 200:
                    job.status = JobStatus.FAILED
                    job.message = f"AnswerCoalesce rejected query ({response.status_code}): {response.text[:200]}"
                    job.progress = 100
                    print(f">>> AC rejected query: {response.status_code}")
                    return
                
                ac_job_data = response.json()
                ac_job_id = ac_job_data.get("job_id")
                
                if not ac_job_id:
                    job.status = JobStatus.FAILED
                    job.message = "AnswerCoalesce did not return a job ID"
                    job.progress = 100
                    print(f">>> No job_id in response: {ac_job_data}")
                    return
                
                job.ac_job_id = ac_job_id
                print(f">>> AC job submitted successfully: {ac_job_id}")
            
            # ============================================================
            # STEP 2: Poll for completion
            # ============================================================
            job.progress = 15
            job.message = "Query submitted, waiting for AnswerCoalesce to process..."
            await asyncio.sleep(1)
            elapsed = 0
            last_ac_status = "running"
            
            async with httpx.AsyncClient(timeout=600.0) as client:
                while elapsed < MAX_WAIT_SECONDS:
                    try:
                        status_response = await client.get(f"{AC_QUERY_STATUS}/{ac_job_id}")
                    except (httpx.ConnectError, httpx.TimeoutException) as e:
                        # Network blip - keep trying
                        print(f">>> Status check failed (will retry): {e}")
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        elapsed += POLL_INTERVAL_SECONDS
                        continue
                    
                    if status_response.status_code == 404:
                        if elapsed < 10:  # Retry for first 10 seconds
                            print(f">>> AC job {ac_job_id} not found yet, retrying... (elapsed: {elapsed}s)")
                            await asyncio.sleep(POLL_INTERVAL_SECONDS)
                            elapsed += POLL_INTERVAL_SECONDS
                            continue
                        else:
                            job.status = JobStatus.FAILED
                            job.message = "AnswerCoalesce job not found. It may have expired."
                            job.progress = 100
                            print(f">>> AC job {ac_job_id} not found (404)")
                            return
                    
                    if status_response.status_code != 200:
                        print(f">>> Unexpected status check response: {status_response.status_code}")
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        elapsed += POLL_INTERVAL_SECONDS
                        continue
                    
                    status_data = status_response.json()
                    ac_status = status_data.get("status", "unknown")
                    ac_error = status_data.get("error")
                    
                    print(f">>> AC status: {ac_status} (elapsed: {elapsed}s)")
                    
                    if ac_status == "completed":
                        job.progress = 80
                        job.message = "AnswerCoalesce complete, fetching results..."
                        print(f">>> AC job completed!")
                        await asyncio.sleep(1)
                        break
                    
                    elif ac_status == "failed":
                        job.status = JobStatus.FAILED
                        job.message = f"AnswerCoalesce failed: {ac_error or 'Unknown error'}"
                        job.progress = 100
                        print(f">>> AC job failed: {ac_error}")
                        return
                    
                    # Update progress message with elapsed time
                    minutes = elapsed // 60
                    seconds = elapsed % 60
                    if minutes > 0:
                        time_str = f"{minutes}m {seconds}s"
                    else:
                        time_str = f"{seconds}s"
                    
                    # Progress: 15-80 range during polling
                    job.progress = min(15 + int((elapsed / MAX_WAIT_SECONDS) * 65), 79)
                    job.message = f"Processing query... ({time_str} elapsed)"
                    
                    last_ac_status = ac_status
                    await asyncio.sleep(POLL_INTERVAL_SECONDS)
                    elapsed += POLL_INTERVAL_SECONDS
                
                else:
                    # Loop completed without break = timeout
                    job.status = JobStatus.FAILED
                    job.message = f"AnswerCoalesce timed out after {MAX_WAIT_SECONDS // 60} minutes. Try a simpler query."
                    job.progress = 100
                    print(f">>> AC job timed out after {MAX_WAIT_SECONDS}s")
                    return
            
            # ============================================================
            # STEP 3: Fetch results
            # ============================================================
            job.progress = 85
            job.message = "Fetching results from AnswerCoalesce..."
            print(f">>> Fetching results from {AC_QUERY_RESULT}/{ac_job_id}")
            
            async with httpx.AsyncClient(timeout=600.0) as client:  # Longer timeout for large results
                try:
                    result_response = await client.get(f"{AC_QUERY_RESULT}/{ac_job_id}")
                except httpx.TimeoutException:
                    job.status = JobStatus.FAILED
                    job.message = "Timed out fetching results. The response may be too large."
                    job.progress = 100
                    print(f">>> Timeout fetching results")
                    return
                except httpx.ConnectError as e:
                    job.status = JobStatus.FAILED
                    job.message = "Lost connection while fetching results."
                    job.progress = 100
                    print(f">>> Connection error fetching results: {e}")
                    return
                
                print(f">>> Result response status: {result_response.status_code}")
                print(f">>> Result size: {len(result_response.content)} bytes")
                
                if result_response.status_code != 200:
                    job.status = JobStatus.FAILED
                    job.message = f"Failed to fetch results ({result_response.status_code})"
                    job.progress = 100
                    print(f">>> Failed to fetch results: {result_response.status_code}")
                    return
                
                ac_response = result_response.json()
            
            # ============================================================
            # STEP 4: Store results and complete
            # ============================================================
            job.progress = 95
            job.message = "Processing results..."
            
            # Extract logs if present
            logs = ac_response.get("logs", [])
            if not logs and "message" in ac_response:
                logs = ac_response.get("message", {}).get("logs", [])
            job.logs = logs
            
            # Store the full response
            self.results[job_id] = ac_response
            
            # Count results
            num_results = len(ac_response.get("message", {}).get("results", []))
            if num_results == 0:
                # Try alternate location
                num_results = len(ac_response.get("results", []))
            
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.message = f"Analysis completed - {num_results} results"
            job.completed_at = datetime.now()
            
            print(f">>> JOB COMPLETED! {num_results} results")
            
        except Exception as e:
            import traceback
            print(f">>> EXCEPTION: {type(e).__name__}: {e}")
            traceback.print_exc()
            job.status = JobStatus.FAILED
            job.message = f"Analysis failed: {str(e)}"
            job.progress = 100

    async def get_job_status(self, job_id: str) -> Job:
        """Get job status"""
        job = self.jobs.get(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        return job
    
    async def get_results(self, job_id: str) -> Dict[str, Any]:
        """Get full AnswerCoalesce response"""
        results = self.results.get(job_id)
        if not results:
            raise ValueError(f"Results for job {job_id} not found")
        return results
    
    async def get_user_jobs(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Job]:
        """Get all jobs for a user"""
        user_jobs = [job for job in self.jobs.values() if job.user_id == user_id]
        # Sort by created_at descending
        user_jobs.sort(key=lambda j: j.created_at, reverse=True)
        return user_jobs[offset:offset + limit]