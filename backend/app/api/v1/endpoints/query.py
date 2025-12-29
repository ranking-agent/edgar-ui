"""Knowledge graph query endpoints"""
from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from app.api.deps import get_current_user, User

router = APIRouter()

class PathQuery(BaseModel):
    source: str
    target: str
    max_length: int = 3

@router.post("/paths")
async def query_paths(query: PathQuery, current_user: User = Depends(get_current_user)):
    return {"message": "Query endpoint - to be implemented", "query": query.dict()}

@router.get("/node/{node_id}")
async def get_node(node_id: str, current_user: User = Depends(get_current_user)):
    return {"id": node_id, "label": "Mock Node", "type": "Gene"}
