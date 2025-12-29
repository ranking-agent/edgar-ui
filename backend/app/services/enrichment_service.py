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
        job = self.jobs.get(job_id)
        if not job:
            return
        
        try:
            job.status = JobStatus.RUNNING
            job.progress = 20
            job.message = "Sending query to AnswerCoalesce..."
            
            # Prepare request data
            request_data = job.request.dict()
            
            # Send to AnswerCoalesce
            job.progress = 30
            job.message = "Waiting for AnswerCoalesce response..."
            
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(AC_URL, json=request_data)
                response.raise_for_status()
                ac_response = response.json()
            
            job.progress = 80
            job.message = "Processing response..."
            
            # Store the FULL AnswerCoalesce response
            # This includes: message, knowledge_graph, results, auxiliary_graphs, etc.
            results = EnrichmentResult(**ac_response)
            self.results[job_id] = results
            
            # Get count of results
            num_results = len(ac_response.get("results", []))
            
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.message = f"Analysis completed - {num_results} results returned"
            job.completed_at = datetime.now()
            
        except httpx.HTTPStatusError as e:
            job.status = JobStatus.FAILED
            job.message = f"AnswerCoalesce returned error: {e.response.status_code}"
            job.progress = 100
        except httpx.TimeoutException:
            job.status = JobStatus.FAILED
            job.message = "Request to AnswerCoalesce timed out (>5 minutes)"
            job.progress = 100
        except Exception as e:
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
