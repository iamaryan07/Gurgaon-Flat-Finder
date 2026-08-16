from fastapi import APIRouter, Response

from app.core.config import settings
from app.core.redis_cache import cached
from app.services.market_service import get_market_service

router = APIRouter(prefix="/market", tags=["market intelligence"])


def _service():
    return get_market_service(str(settings.resolved_market_data_path))


@router.get("/overview")
def overview(response: Response) -> dict:
    result, hit = cached("market:overview", lambda: _service().overview())
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return result


@router.get("/sectors")
def sectors(response: Response) -> list[dict]:
    result, hit = cached("market:sectors", lambda: _service().sectors())
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return result


@router.get("/analytics")
def analytics(response: Response) -> dict:
    result, hit = cached("market:analytics", lambda: _service().analytics())
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return result


@router.get("/insights")
def insights(response: Response) -> dict:
    result, hit = cached("market:insights", lambda: _service().insights())
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return result
