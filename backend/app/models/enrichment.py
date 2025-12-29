"""
Pydantic models for EDGAR enrichment analysis
Returns full TRAPI response from AnswerCoalesce
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    """Job status enumeration."""
    IDLE = "idle"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class QualifierSet(BaseModel):
    """TRAPI qualifier set"""
    qualifier_type_id: str
    qualifier_value: str


class QualifierConstraint(BaseModel):
    """TRAPI qualifier constraint"""
    qualifier_set: List[QualifierSet]


class NodeConstraints(BaseModel):
    """TRAPI node constraints"""
    ids: Optional[List[str]] = None
    categories: List[str]
    set_interpretation: str = "BATCH"
    constraints: List[Any] = []
    is_set: bool = False


class Edge(BaseModel):
    """TRAPI edge"""
    subject: str
    object: str
    predicates: List[str]
    knowledge_type: str = "inferred"
    attribute_constraints: List[Any] = []
    qualifier_constraints: List[QualifierConstraint] = []


class QueryGraph(BaseModel):
    """TRAPI query graph"""
    nodes: Dict[str, NodeConstraints]
    edges: Dict[str, Edge]


class QueryMessage(BaseModel):
    """TRAPI query message"""
    query_graph: QueryGraph


class EnrichmentParameters(BaseModel):
    """EDGAR-specific parameters"""
    pvalue_threshold: float = Field(default=1e-5, ge=0.0, le=1.0)
    result_length: int = Field(default=100, ge=1, le=10000)
    predicates_to_exclude: List[str] = Field(
        default_factory=lambda: [
            "biolink:causes",
            "biolink:biomarker_for",
            "biolink:contraindicated_for",
            "biolink:contraindicated_in",
            "biolink:contributes_to",
            "biolink:has_adverse_event",
            "biolink:causes_adverse_event"
        ]
    )


class EnrichmentAnalysisRequest(BaseModel):
    """EDGAR enrichment analysis request"""
    message: QueryMessage
    parameters: Optional[EnrichmentParameters] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": {
                    "query_graph": {
                        "nodes": {
                            "disease": {
                                "ids": ["MONDO:0004975"],
                                "categories": ["biolink:Disease"],
                                "set_interpretation": "BATCH",
                                "constraints": [],
                                "is_set": False
                            },
                            "drug": {
                                "categories": ["biolink:Drug"],
                                "set_interpretation": "BATCH",
                                "constraints": [],
                                "is_set": False
                            }
                        },
                        "edges": {
                            "e00": {
                                "subject": "drug",
                                "object": "disease",
                                "predicates": ["biolink:treats"],
                                "knowledge_type": "inferred",
                                "attribute_constraints": [],
                                "qualifier_constraints": []
                            }
                        }
                    }
                },
                "parameters": {
                    "pvalue_threshold": 1e-5,
                    "result_length": 100,
                    "predicates_to_exclude": [
                        "biolink:causes",
                        "biolink:biomarker_for",
                        "biolink:contraindicated_for",
                        "biolink:contraindicated_in",
                        "biolink:contributes_to",
                        "biolink:has_adverse_event",
                        "biolink:causes_adverse_event"
                    ]
                }
            }
        }


class EnrichmentAnalysisResponse(BaseModel):
    """Response for enrichment analysis job"""
    job_id: str
    status: JobStatus
    progress: int = Field(default=0, ge=0, le=100)
    message: Optional[str] = None
    ws_url: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# The actual result is just the full TRAPI response from AnswerCoalesce
# We don't need to define every field - just pass it through
class EnrichmentResult(BaseModel):
    """
    Complete TRAPI response from AnswerCoalesce.
    Includes: message, knowledge_graph, results, auxiliary_graphs, logs, parameters
    """
    # Allow any additional fields from AC response
    class Config:
        extra = "allow"
    
    # Core fields we know about
    message: Optional[Dict[str, Any]] = None
    knowledge_graph: Optional[Dict[str, Any]] = None
    results: Optional[List[Dict[str, Any]]] = None
    auxiliary_graphs: Optional[Dict[str, Any]] = None
    logs: Optional[List[Any]] = None
    parameters: Optional[Dict[str, Any]] = None
