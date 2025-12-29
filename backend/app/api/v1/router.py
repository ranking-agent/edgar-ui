"""API v1 Router"""
from fastapi import APIRouter
from app.api.v1.endpoints import enrichment, query, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(enrichment.router, prefix="/enrichment", tags=["enrichment"])
api_router.include_router(query.router, prefix="/query", tags=["query"])
