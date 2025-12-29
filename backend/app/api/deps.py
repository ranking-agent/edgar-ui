"""API dependencies"""
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

# Fix: Use absolute path for tokenUrl
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

class User:
    def __init__(self, id: str, username: str, email: str):
        self.id = id
        self.username = username
        self.email = email

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    return User(id="dev-user-1", username="developer", email="cbizon@renci.org")

# SINGLETON: Create one instance that persists
_enrichment_service = None

def get_enrichment_service():
    global _enrichment_service
    if _enrichment_service is None:
        from app.services.enrichment_service import EnrichmentService
        _enrichment_service = EnrichmentService()
    return _enrichment_service
