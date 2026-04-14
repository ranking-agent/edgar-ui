import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List
from app.models.enrichment import (
    EnrichmentAnalysisRequest,
    EnrichmentAnalysisResponse,
    EnrichmentResult,
    JobStatus
)
from app.services.enrichment_service import EnrichmentService
from app.api.deps import get_current_user, get_enrichment_service, User

router = APIRouter()


@router.post(
    "/analyze",
    response_model=EnrichmentAnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit EDGAR enrichment analysis",
    description="""
    Submit a TRAPI query for enrichment-driven link prediction.
    
    The query is sent to AnswerCoalesce which performs enrichment analysis
    and returns candidate entities ranked by statistical significance.
    """
)
async def create_enrichment_analysis(
    request: EnrichmentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    enrichment_service: EnrichmentService = Depends(get_enrichment_service)
):
    """
    Submit TRAPI query for enrichment analysis.
    Returns job_id to track progress.
    """
    try:
        await enrichment_service.validate_request(request)
        
        job = await enrichment_service.create_job(
            user_id=current_user.id,
            request=request
        )
        
        print(f">>> Creating task for job {job.id}")
        # Start background task
        asyncio.create_task(enrichment_service.run_analysis(job.id))
        print(f">>> Task created for job {job.id}")  
        
        return EnrichmentAnalysisResponse(
            job_id=job.id,
            status=JobStatus.QUEUED,
            message="Analysis queued - query will be sent to AnswerCoalesce",
            ws_url=f"/ws/job/{job.id}",
            created_at=job.created_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start analysis: {str(e)}"
        )


@router.get(
    "/status/{job_id}",
    response_model=EnrichmentAnalysisResponse,
    summary="Get job status"
)
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    enrichment_service: EnrichmentService = Depends(get_enrichment_service)
):
    """Get the status of an enrichment analysis job"""
    try:
        job = await enrichment_service.get_job_status(job_id)
        
        if job.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return EnrichmentAnalysisResponse(
            job_id=job.id,
            status=job.status,
            progress=job.progress,
            message=job.message,
            created_at=job.created_at,
            completed_at=job.completed_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/results/{job_id}",
    summary="Get full TRAPI response from AnswerCoalesce",
    description="""
    Returns the complete TRAPI response from AnswerCoalesce including:
    - message (with query_graph)
    - knowledge_graph (all nodes and edges)
    - results (node_bindings and analyses)
    - auxiliary_graphs
    - logs
    - parameters
    """
)
async def get_analysis_results(
    job_id: str,
    current_user: User = Depends(get_current_user),
    enrichment_service: EnrichmentService = Depends(get_enrichment_service)
):
    """
    Get the complete TRAPI response from AnswerCoalesce.
    Returns raw JSON to preserve all fields.
    """
    try:
        job = await enrichment_service.get_job_status(job_id)
        
        if job.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        if job.status != JobStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job is not completed (status: {job.status})"
            )
        
        results = await enrichment_service.get_results(job_id)
        
        # Return as raw JSON to preserve all AC fields
        if isinstance(results, dict):
            return JSONResponse(content=results)
        else:
            return JSONResponse(content=results.dict(exclude_none=True))
        # return JSONResponse(content=results.dict(exclude_none=True))
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/history",
    response_model=List[EnrichmentAnalysisResponse],
    summary="Get user's job history"
)
async def get_job_history(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    enrichment_service: EnrichmentService = Depends(get_enrichment_service)
):
    """Get the user's enrichment analysis job history"""
    jobs = await enrichment_service.get_user_jobs(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    
    return [
        EnrichmentAnalysisResponse(
            job_id=job.id,
            status=job.status,
            progress=job.progress,
            message=job.message,
            created_at=job.created_at,
            completed_at=job.completed_at
        )
        for job in jobs
    ]


@router.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    enrichment_service: EnrichmentService = Depends(get_enrichment_service),
):
    notifications = await enrichment_service.get_notifications(current_user.id)
    return {"notifications": notifications}


@router.post("/notifications/{job_id}/seen")
async def mark_seen(
    job_id: str,
    current_user: User = Depends(get_current_user),
    enrichment_service: EnrichmentService = Depends(get_enrichment_service),
):
    job = await enrichment_service.get_job_status(job_id)
    if job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    await enrichment_service.mark_notification_seen(job_id)
    return {"status": "ok"}