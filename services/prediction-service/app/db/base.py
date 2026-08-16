from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, JSON, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class PredictionRequestRecord(Base):
    __tablename__ = "prediction_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    predicted_price_crore: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
