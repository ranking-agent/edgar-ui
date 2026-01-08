"""
EDGAR - Enrichment-Driven GrAph Reasoner
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.neo4j import init_neo4j, close_neo4j
from app.db.redis import init_redis, close_redis

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Initialize FastAPI app
app = FastAPI(
    title="EDGAR API",
    description="""
    Enrichment-Driven GrAph Reasoner for Biomedical Knowledge Graphs
    
    Enrichment-driven link prediction supporting multiple use cases:
    - Drug repurposing (disease → drug)
    - Gene discovery (disease → gene)
    - Function prediction (gene → biological process)
    - Pathway analysis (gene → pathway)
    - Target identification (chemical → gene)
    - Custom queries
    """,
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup."""
    logger.info("Starting EDGAR API")
    await init_neo4j()
    await init_redis()
    logger.info("EDGAR API started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Close connections on shutdown."""
    logger.info("Shutting down EDGAR API")
    await close_neo4j()
    await close_redis()
    logger.info("EDGAR API shut down successfully")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "EDGAR API - Enrichment-Driven GrAph Reasoner",
        "docs": "/api/docs",
        "version": "2.0.0",
        "description": "Enrichment-Driven link prediction for biomedical knowledge graphs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes."""
    return {"status": "healthy"}

# WebSocket connection manager
class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[job_id] = websocket
        logger.info("websocket_connected", job_id=job_id)
    
    def disconnect(self, job_id: str):
        if job_id in self.active_connections:
            del self.active_connections[job_id]
            logger.info("websocket_disconnected", job_id=job_id)
    
    async def send_update(self, job_id: str, message: dict):
        if job_id in self.active_connections:
            websocket = self.active_connections[job_id]
            await websocket.send_json(message)


manager = ConnectionManager()


@app.websocket("/ws/job/{job_id}")
async def job_status_websocket(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time job status updates.
    
    Clients can connect to receive updates about enrichment analysis progress.
    """
    await manager.connect(job_id, websocket)
    
    try:
        # Keep connection alive and listen for updates
        while True:
            # In production, this would subscribe to Redis pub/sub
            # For now, just keep the connection alive
            data = await websocket.receive_text()
            
    except WebSocketDisconnect:
        manager.disconnect(job_id)
        logger.info("client_disconnected", job_id=job_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
