import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import httpx
from app.models.enrichment import *

# AnswerCoalesce endpoints
AC_BASE_URL = os.environ.get("AC_BASE_URL", "https://answercoalesce-test.apps.renci.org")
AC_ASYNCQUERY = f"{AC_BASE_URL}/asyncquery"
AC_QUERY_STATUS = f"{AC_BASE_URL}/query/status"

# EDGAR's own base URL for callbacks (AC will POST results here)
EDGAR_BASE_URL = os.environ.get("EDGAR_BASE_URL", "https://edgar-test.apps.renci.org")
EDGAR_CALLBACK_PATH = "/api/v1/enrichment/callback"

# Fallback polling (used when callback fails or AC doesn't support /asyncquery)
MAX_WAIT_SECONDS = int(os.environ.get("MAX_WAIT_SECONDS", 3600))
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", 5))
AC_QUERY_RESULT = f"{AC_BASE_URL}/query/result"
AC_QUERY_ASYNC = f"{AC_BASE_URL}/query/async"


def _format_elapsed(seconds: float) -> str:
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    m, sec = divmod(s, 60)
    return f"{m}m {sec}s"


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
        self.logs = []
        self.ac_job_id = None


class EnrichmentService:
    """
    EDGAR enrichment service.
    Submits TRAPI queries to AnswerCoalesce's /asyncquery with a callback URL.
    AC processes in the background and POSTs the result to the callback when done.
    Falls back to polling if the callback approach fails.
    """

    def __init__(self):
        self.jobs = {}
        self.results = {}
        self.completed_notifications = {}

    async def validate_request(self, request: EnrichmentAnalysisRequest):
        if not request.message.query_graph:
            raise ValueError("Query graph is required")
        if not request.message.query_graph.nodes:
            raise ValueError("Query graph must have nodes")
        if not request.message.query_graph.edges:
            raise ValueError("Query graph must have edges")
        return True

    async def create_job(self, user_id: str, request: EnrichmentAnalysisRequest) -> Job:
        job_id = str(uuid.uuid4())
        job = Job(job_id, user_id, request)
        self.jobs[job_id] = job
        return job

    async def run_analysis(self, job_id: str):
        """
        Submit query to AC's /asyncquery with a callback URL.
        AC will POST the full TRAPI response to our callback endpoint when done.
        Falls back to polling if /asyncquery is unavailable.
        """
        job = self.jobs.get(job_id)
        if not job:
            return

        try:
            job.status = JobStatus.RUNNING
            job.progress = 10
            job.message = "Submitting query to AnswerCoalesce..."

            request_data = job.request.dict()
            callback_url = f"{EDGAR_BASE_URL}{EDGAR_CALLBACK_PATH}/{job_id}"
            request_data["callback"] = callback_url

            async with httpx.AsyncClient(timeout=60.0) as client:
                try:
                    response = await client.post(AC_ASYNCQUERY, json=request_data)
                except (httpx.ConnectError, httpx.TimeoutException) as e:
                    # /asyncquery not available — fall back to old polling flow
                    return await self._run_analysis_polling(job_id)

                if response.status_code == 404:
                    return await self._run_analysis_polling(job_id)

                if response.status_code not in (200, 202):
                    job.status = JobStatus.FAILED
                    job.message = f"AnswerCoalesce rejected query ({response.status_code})"
                    job.progress = 100
                    return

                ac_job_data = response.json()
                ac_job_id = ac_job_data.get("job_id")
                if not ac_job_id:
                    job.status = JobStatus.FAILED
                    job.message = "AnswerCoalesce did not return a job ID"
                    job.progress = 100
                    return

                job.ac_job_id = ac_job_id

            job.progress = 20
            job.message = "Query submitted — waiting for AnswerCoalesce callback..."

            # Wait for callback to deliver the result (with timeout)
            elapsed = 0
            while elapsed < MAX_WAIT_SECONDS:
                if job.status == JobStatus.COMPLETED or job.status == JobStatus.FAILED:
                    return
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                elapsed += POLL_INTERVAL_SECONDS
                job.progress = min(20 + int((elapsed / MAX_WAIT_SECONDS) * 70), 89)
                job.message = f"Processing query... ({_format_elapsed(elapsed)} elapsed)"

            # Timeout — callback never arrived, try fetching directly
            if job.status == JobStatus.RUNNING:
                await self._try_fetch_result(job)
                if job.status != JobStatus.COMPLETED:
                    job.status = JobStatus.FAILED
                    job.message = f"Timed out after {MAX_WAIT_SECONDS // 60} minutes"
                    job.progress = 100

        except Exception as e:
            import traceback
            traceback.print_exc()
            job.status = JobStatus.FAILED
            job.message = f"Analysis failed: {str(e)}"
            job.progress = 100

    async def receive_callback(self, job_id: str, result: dict):
        """Called by the callback endpoint when AC delivers the result."""
        job = self.jobs.get(job_id)
        if not job:
            return False

        if "error" in result and result.get("error"):
            job.status = JobStatus.FAILED
            job.message = f"AnswerCoalesce failed: {result['error']}"
            job.progress = 100
            return True

        self.results[job_id] = result
        logs = result.get("logs", [])
        if not logs and "message" in result:
            logs = result.get("message", {}).get("logs", [])
        job.logs = logs

        num_results = len(result.get("message", {}).get("results", []))
        elapsed_seconds = (datetime.now() - job.created_at).total_seconds()

        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.completed_at = datetime.now()
        job.message = f"Analysis completed ({_format_elapsed(elapsed_seconds)}) - {num_results} results"

        if elapsed_seconds > 30:
            self.completed_notifications[job_id] = {
                "job_id": job_id,
                "user_id": job.user_id,
                "num_results": num_results,
                "completed_at": job.completed_at.isoformat(),
                "elapsed_seconds": int(elapsed_seconds),
                "seen": False
            }
        return True

    async def _try_fetch_result(self, job: Job):
        """Last resort: try to fetch result directly from AC."""
        if not job.ac_job_id:
            return
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.get(f"{AC_QUERY_RESULT}/{job.ac_job_id}")
                if resp.status_code == 200:
                    await self.receive_callback(job.id, resp.json())
        except Exception:
            pass

    async def _run_analysis_polling(self, job_id: str):
        """Fallback: use /query/async + polling when /asyncquery is unavailable."""
        job = self.jobs.get(job_id)
        if not job:
            return

        try:
            request_data = job.request.dict()
            job.message = "Submitting query (polling mode)..."

            async with httpx.AsyncClient(timeout=600.0) as client:
                response = await client.post(AC_QUERY_ASYNC, json=request_data)

                if response.status_code != 200:
                    job.status = JobStatus.FAILED
                    job.message = f"AnswerCoalesce rejected query ({response.status_code})"
                    job.progress = 100
                    return

                ac_job_id = response.json().get("job_id")
                if not ac_job_id:
                    job.status = JobStatus.FAILED
                    job.message = "No job ID returned"
                    job.progress = 100
                    return
                job.ac_job_id = ac_job_id

            job.progress = 15
            job.message = "Query submitted, polling for completion..."
            elapsed = 0

            async with httpx.AsyncClient(timeout=600.0) as client:
                while elapsed < MAX_WAIT_SECONDS:
                    try:
                        status_resp = await client.get(f"{AC_QUERY_STATUS}/{ac_job_id}")
                    except (httpx.ConnectError, httpx.TimeoutException):
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        elapsed += POLL_INTERVAL_SECONDS
                        continue

                    if status_resp.status_code == 404 and elapsed < 10:
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        elapsed += POLL_INTERVAL_SECONDS
                        continue

                    if status_resp.status_code != 200:
                        await asyncio.sleep(POLL_INTERVAL_SECONDS)
                        elapsed += POLL_INTERVAL_SECONDS
                        continue

                    status_data = status_resp.json()
                    ac_status = status_data.get("status", "unknown")

                    if ac_status == "completed":
                        job.progress = 80
                        job.message = "Fetching results..."
                        break
                    elif ac_status == "failed":
                        job.status = JobStatus.FAILED
                        job.message = f"AnswerCoalesce failed: {status_data.get('error', 'Unknown')}"
                        job.progress = 100
                        return

                    job.progress = min(15 + int((elapsed / MAX_WAIT_SECONDS) * 65), 79)
                    job.message = f"Processing... ({_format_elapsed(elapsed)} elapsed)"
                    await asyncio.sleep(POLL_INTERVAL_SECONDS)
                    elapsed += POLL_INTERVAL_SECONDS
                else:
                    job.status = JobStatus.FAILED
                    job.message = f"Timed out after {MAX_WAIT_SECONDS // 60} minutes"
                    job.progress = 100
                    return

            # Fetch result
            async with httpx.AsyncClient(timeout=600.0) as client:
                result_resp = await client.get(f"{AC_QUERY_RESULT}/{ac_job_id}")
                if result_resp.status_code != 200:
                    job.status = JobStatus.FAILED
                    job.message = f"Failed to fetch results ({result_resp.status_code})"
                    job.progress = 100
                    return
                await self.receive_callback(job_id, result_resp.json())

        except Exception as e:
            import traceback
            traceback.print_exc()
            job.status = JobStatus.FAILED
            job.message = f"Analysis failed: {str(e)}"
            job.progress = 100

    async def get_job_status(self, job_id: str) -> Job:
        job = self.jobs.get(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        return job

    async def get_results(self, job_id: str) -> Dict[str, Any]:
        results = self.results.get(job_id)
        if not results:
            raise ValueError(f"Results for job {job_id} not found")
        return results

    async def get_user_jobs(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Job]:
        user_jobs = [job for job in self.jobs.values() if job.user_id == user_id]
        user_jobs.sort(key=lambda j: j.created_at, reverse=True)
        return user_jobs[offset:offset + limit]

    async def get_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        notifications = []
        for _, data in self.completed_notifications.items():
            if data["user_id"] == user_id and not data["seen"]:
                notifications.append(data)
        return notifications

    async def mark_notification_seen(self, job_id: str):
        if job_id in self.completed_notifications:
            self.completed_notifications[job_id]["seen"] = True
