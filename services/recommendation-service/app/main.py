from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.recommendations import router as recommendations_router
from app.core.config import settings

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[settings.web_origin], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(recommendations_router, prefix=settings.api_prefix)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "recommendation-service"}
