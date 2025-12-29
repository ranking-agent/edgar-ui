"""Redis connection"""
import structlog
logger = structlog.get_logger()

async def init_redis():
    logger.info("Redis connection initialized (stub)")

async def close_redis():
    logger.info("Redis connection closed (stub)")
