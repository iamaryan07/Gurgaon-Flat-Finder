from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.services.market_service import get_market_service
from app.services.model_service import get_model_service

router = APIRouter(prefix="/market", tags=["market intelligence"])


def _service():
    return get_market_service(str(settings.resolved_market_data_path))


@router.get("/overview")
def overview() -> dict:
    return _service().overview()


@router.get("/sectors")
def sectors() -> list[dict]:
    return _service().sectors()


@router.get("/analytics")
def analytics() -> dict:
    result = _service().analytics()
    try:
        model = get_model_service(settings.model_repo_id, settings.model_filename)
        result["feature_importance"] = model.feature_importances()
    except Exception:
        result["feature_importance"] = []
    return result


@router.get("/insights")
def insights() -> dict:
    return _service().insights()


@router.get("/recommendations")
def recommendations(
    sector: str = Query(...),
    bedroom: int = Query(..., ge=1, le=10),
    budget: float = Query(..., gt=0),
) -> list[dict]:
    return _service().recommendations(sector, bedroom, budget)
