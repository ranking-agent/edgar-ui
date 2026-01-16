"""
EDGAR Enrichment Service
Sends TRAPI queries to AnswerCoalesce and returns the full response
"""
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import httpx
from app.models.enrichment import *

AC_URL = "https://answercoalesce.renci.org/query"

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

class EnrichmentService:
    """
    EDGAR enrichment service.
    Forwards TRAPI queries to AnswerCoalesce and returns full response.
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
        print(request)
        return True
    
    async def create_job(self, user_id: str, request: EnrichmentAnalysisRequest) -> Job:
        """Create a new enrichment analysis job"""
        job_id = str(uuid.uuid4())
        job = Job(job_id, user_id, request)
        self.jobs[job_id] = job
        return job
    
    async def run_analysis(self, job_id: str):
        """
        Run enrichment analysis:
        1. Send TRAPI query to AnswerCoalesce
        2. Store the full response
        """
        print(f"\n\n>>> RUN_ANALYSIS CALLED FOR {job_id}\n\n")
        
        job = self.jobs.get(job_id)
        if not job:
            print(f">>> ERROR: Job {job_id} not found in self.jobs!")
            return
        
        try:
            job.status = JobStatus.RUNNING
            job.progress = 20
            job.message = "Sending query to AnswerCoalesce..."
            print(f">>> Job status set to RUNNING")
            
            request_data = job.request.dict()
            print(f">>> Request data prepared")
            
            job.progress = 30
            job.message = "Waiting for AnswerCoalesce response..."
            
            print(f">>> Sending request to AnswerCoalesce...")
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(AC_URL, json=request_data)
                print(f">>> Response received! Status: {response.status_code}")
                print(f">>> Response size: {len(response.content)} bytes")
                
                # Handle AnswerCoalesce-specific errors
                if response.status_code == 502:
                    job.status = JobStatus.FAILED
                    job.message = "AnswerCoalesce server error (502): The query may be too complex or returned too many results. Try a more specific query or add result limits."
                    job.progress = 100
                    print(f">>> AnswerCoalesce 502 - server crashed")
                    return
                
                if response.status_code == 504:
                    job.status = JobStatus.FAILED
                    job.message = "AnswerCoalesce timeout (504): The query took too long to process. Try a simpler query."
                    job.progress = 100
                    print(f">>> AnswerCoalesce 504 - gateway timeout")
                    return
                
                if response.status_code >= 500:
                    job.status = JobStatus.FAILED
                    job.message = f"AnswerCoalesce server error ({response.status_code}): External service is experiencing issues. Please try again later."
                    job.progress = 100
                    print(f">>> AnswerCoalesce {response.status_code} error")
                    return
                
                if response.status_code >= 400:
                    job.status = JobStatus.FAILED
                    job.message = f"AnswerCoalesce rejected the query ({response.status_code}): {response.text[:200]}"
                    job.progress = 100
                    print(f">>> AnswerCoalesce {response.status_code} client error")
                    return
                
                response.raise_for_status()
                ac_response = response.json()
                print(f">>> JSON parsed! Results count: {len(ac_response.get('results', []))}")
            
            job.progress = 80
            job.message = "Processing response..."
            
            print(f">>> Storing results...")
            self.results[job_id] = ac_response  # Store raw dict
            print(f">>> Results stored!")
            
            num_results = len(ac_response.get("results", []))
            
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.message = f"Analysis completed - {num_results} results returned"
            job.completed_at = datetime.now()
            
            print(f">>> JOB COMPLETED! {num_results} results")
            
        except httpx.TimeoutException:
            # print(f">>> TIMEOUT ERROR!")
            job.status = JobStatus.FAILED
            job.message = "AnswerCoalesce request timed out after 5 minutes. Try a simpler query with fewer expected results."
            job.progress = 100
        except httpx.ConnectError:
            # print(f">>> CONNECTION ERROR!")
            job.status = JobStatus.FAILED
            job.message = "Could not connect to AnswerCoalesce. The service may be down. Please try again later."
            job.progress = 100
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
    
    async def get_results(self, job_id: str) -> EnrichmentResult:
        """Get full AnswerCoalesce response"""
        results = self.results.get(job_id)
        if not results:
            raise ValueError(f"Results for job {job_id} not found")
        return results
    
    async def get_user_jobs(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Job]:
        """Get all jobs for a user"""
        user_jobs = [job for job in self.jobs.values() if job.user_id == user_id]
        return user_jobs[offset:offset + limit]
