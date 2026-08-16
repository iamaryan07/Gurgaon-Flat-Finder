from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.db.base import PredictionRequestRecord
from app.db.session import get_db_session
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.model_service import get_model_service

router = APIRouter(prefix="/predictions", tags=["predictions"])


def _service():
    return get_model_service(settings.model_repo_id, settings.model_filename)


@router.get("/options")
def prediction_options() -> dict:
    """Return the model's exact categorical values and real feature importances."""
    try:
        service = _service()
        return {
            **service.metadata(),
            "feature_importance": service.feature_importances(),
        }
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail="Model artifact is unavailable") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Model metadata could not be read") from error


@router.post("", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
def create_prediction(payload: PredictionRequest) -> PredictionResponse:
    try:
        prediction = _service().predict(payload)
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail="Model artifact is unavailable") from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Prediction could not be calculated") from error

    _persist(payload, prediction)

    return PredictionResponse(
        predicted_price_crore=round(prediction, 2),
        predicted_price_lakh=round(prediction * 100, 1),
        model_version="property-price-model-v1",
    )


def _persist(payload: PredictionRequest, prediction: float) -> None:
    session = get_db_session()
    if session is None:
        return
    try:
        session.add(
            PredictionRequestRecord(
                request_payload=payload.model_dump(),
                predicted_price_crore=round(prediction, 2),
            )
        )
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()
