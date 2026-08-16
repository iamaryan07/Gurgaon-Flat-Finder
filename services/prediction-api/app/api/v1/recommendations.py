from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
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
def location(landmark: str = Query(...), radius: int = Query(5, ge=1, le=30)) -> list[dict]:
    try:
        return _service().location(landmark, radius)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown landmark: {landmark}") from error


@router.get("/similar")
def similar(property_name: str = Query(...)) -> list[dict]:
    try:
        return _service().similar(property_name)
    except (KeyError, IndexError) as error:
        raise HTTPException(status_code=404, detail=f"Unknown property: {property_name}") from error


@router.get("/hybrid")
def hybrid(
    property_name: str = Query(...),
    preference: str = Query("location", pattern="^(location|price)$"),
) -> list[dict]:
    try:
        return _service().hybrid(property_name, preference)
    except (KeyError, IndexError) as error:
        raise HTTPException(status_code=404, detail=f"Unknown property: {property_name}") from error
