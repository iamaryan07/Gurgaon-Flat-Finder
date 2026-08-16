from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.predictions import router as predictions_router
from app.core.config import settings
from app.services.model_service import get_model_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_model_service(settings.model_repo_id, settings.model_filename)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.web_origin], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(predictions_router, prefix=settings.api_prefix)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "prediction-service"}
