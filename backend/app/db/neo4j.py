"""Neo4j database connection"""
import structlog
logger = structlog.get_logger()

async def init_neo4j():
    logger.info("Neo4j connection initialized (stub)")

async def close_neo4j():
    logger.info("Neo4j connection closed (stub)")
