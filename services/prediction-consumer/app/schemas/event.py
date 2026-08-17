from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class PredictionCreatedEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    event: str
    request_payload: dict[str, Any]
    predicted_price_crore: float
    predicted_price_lakh: float
    model_version: str
    created_at: datetime
