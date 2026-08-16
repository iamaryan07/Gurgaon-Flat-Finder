import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.core.config import settings

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_URLS = {
    "predictions": settings.prediction_service_url,
    "market": settings.market_service_url,
    "recommendations": settings.recommendation_service_url,
}

REQUEST_EXCLUDED_HEADERS = {
    "host",
    "content-length",
    "accept-encoding",
    "connection",
    "transfer-encoding",
    "upgrade",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
}

RESPONSE_EXCLUDED_HEADERS = {
    "content-length",
    "content-encoding",
    "transfer-encoding",
    "connection",
}


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "api-gateway"}


@app.api_route(
    "/api/v1/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(full_path: str, request: Request) -> Response:
    service = full_path.split("/", 1)[0] if full_path else ""
    base_url = SERVICE_URLS.get(service)
    if base_url is None:
        return JSONResponse(
            status_code=404,
            content={"detail": f"No downstream service for '{service}'"},
        )

    target_url = f"{base_url}/api/v1/{full_path}"
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in REQUEST_EXCLUDED_HEADERS
    }
    body = await request.body()

    async with httpx.AsyncClient() as client:
        downstream = await client.request(
            request.method,
            target_url,
            params=list(request.query_params.multi_items()),
            headers=headers,
            content=body,
        )

    response_headers = {
        key: value
        for key, value in downstream.headers.items()
        if key.lower() not in RESPONSE_EXCLUDED_HEADERS
    }

    return Response(
        content=downstream.content,
        status_code=downstream.status_code,
        headers=response_headers,
    )
