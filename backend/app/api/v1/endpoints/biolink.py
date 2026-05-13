from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.services.biolink_service import biolink_service

router = APIRouter()


@router.get(
    "/associations",
    summary="Get valid subject-predicate-object associations",
    description="Returns a mapping of 'SubjectCategory|ObjectCategory' to valid predicates, "
    "derived from the Biolink Model via bmt.",
)
async def get_associations():
    return JSONResponse(content=biolink_service.get_associations())
