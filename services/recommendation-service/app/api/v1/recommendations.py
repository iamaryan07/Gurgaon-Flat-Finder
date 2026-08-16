from fastapi import APIRouter, HTTPException, Query, Response

from app.core.config import settings
from app.core.redis_cache import cached
from app.services.recommendation_service import get_recommendation_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _service():
    return get_recommendation_service(
        str(settings.resolved_recommendation_data_path),
        str(settings.resolved_geo_cache_path),
        str(settings.resolved_geo_cache_old_path),
    )


@router.get("/landmarks")
def landmarks() -> list[str]:
    return _service().landmark_names()


@router.get("/societies")
def societies() -> list[str]:
    return sorted(_service().df["Property Name"].unique().tolist())


@router.get("/map")
def geo_map() -> dict:
    return _service().map_data()


@router.get("/location")
def location(
    response: Response,
    landmark: str = Query(...),
    radius: int = Query(5, ge=1, le=30),
) -> list[dict]:
    key = f"recommendations:location:{landmark}:{radius}"
    try:
        result, hit = cached(key, lambda: _service().location(landmark, radius))
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown landmark: {landmark}") from error
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return result


@router.get("/similar")
def similar(
    response: Response,
    property_name: str = Query(...),
) -> list[dict]:
    key = f"recommendations:similar:{property_name}"
    try:
        result, hit = cached(key, lambda: _service().similar(property_name))
    except (KeyError, IndexError) as error:
        raise HTTPException(status_code=404, detail=f"Unknown property: {property_name}") from error
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return result


@router.get("/hybrid")
def hybrid(
    response: Response,
    property_name: str = Query(...),
    preference: str = Query("location", pattern="^(location|price)$"),
) -> list[dict]:
    key = f"recommendations:hybrid:{property_name}:{preference}"
    try:
        result, hit = cached(key, lambda: _service().hybrid(property_name, preference))
    except (KeyError, IndexError) as error:
        raise HTTPException(status_code=404, detail=f"Unknown property: {property_name}") from error
    response.headers["X-Cache"] = "HIT" if hit else "MISS"
    return result
