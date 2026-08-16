# Gurgaon Project

A service-oriented rewrite of the Gurgaon flat analysis app. A Next.js interface talks to three independent FastAPI services over HTTP.

```
Gurgaon Project/
  apps/web/                        # Next.js 16 interface
  services/
    api-gateway/                   # single backend entry point (proxy/router)   :8000
    prediction-service/            # ML inference + optional prediction history  :8001
    market-service/                # market analytics / insights                 :8002
    recommendation-service/        # society / landmark recommendations          :8003
```

## Stack

- **Frontend:** Next.js 16 (App Router, JavaScript/JSX) + Plotly + Leaflet
- **Services:** FastAPI + Pydantic (one per domain)
- **Database:** PostgreSQL (Neon or Supabase free tier) with SQLAlchemy + Alembic (optional, prediction-service only)
- **Model:** hosted on Hugging Face (`iamAryan/gurgaon-property-price-model`), downloaded at startup

## Services and ports

| Service                   | Port | Responsibilities                                                                 |
| ------------------------- | ---- | ------------------------------------------------------------------------------- |
| `api-gateway`             | 8000 | single entry point; routes `/api/v1/*` to the three services below (proxying only) |
| `prediction-service`      | 8001 | `/api/v1/predictions`, `/api/v1/predictions/options`, HF model loading/inference, optional prediction history |
| `market-service`          | 8002 | all `/api/v1/market/*` endpoints, `market_data.parquet` analytics and insights  |
| `recommendation-service`  | 8003 | all `/api/v1/recommendations/*` endpoints, landmark/similarity/hybrid/map logic |

## Features

The web app exposes four routes under a shared sticky navbar:

| Route            | Feature                                                        |
| ---------------- | -------------------------------------------------------------- |
| `/prediction`    | Price prediction using the real trained model                  |
| `/analysis`      | Sector comparison, bivariate analysis, price drivers           |
| `/recommendation`| Landmark / similar / hybrid society recommendations            |
| `/insights`      | Market statistics, price drivers and a what-if studio          |

## Run locally

Start each service in its own terminal, then the website.

1. API gateway:

   ```powershell
   cd services/api-gateway
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8000
   ```

2. Prediction service:

   ```powershell
   cd services/prediction-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8001
   ```

3. Market service:

   ```powershell
   cd services/market-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8002
   ```

4. Recommendation service:

   ```powershell
   cd services/recommendation-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8003
   ```

5. Start the website:

   ```powershell
   cd apps/web
   Copy-Item .env.local.example .env.local
   npm install
   npm run dev
   ```

Open `http://localhost:3000` (redirects to `/prediction`). Each service and the gateway expose FastAPI docs at their own `/docs`.

## Model and data

The ML model is downloaded from Hugging Face Hub (`iamAryan/gurgaon-property-price-model`) at prediction-service startup. No token is required because the repository is public. If the model cannot be downloaded, the prediction endpoints return `503` rather than fabricating predictions. The prediction form's dropdowns are populated from the model's own encoder categories via `GET /api/v1/predictions/options`, so the UI can never drift from the trained feature space.

Market and recommendation datasets are bundled inside their owning services under `data/`.

## API gateway

The gateway is the single backend entry point for the website. It proxies `/api/v1/*` requests to the appropriate service without duplicating any business logic:

| Gateway path                | Downstream service          |
| --------------------------- | --------------------------- |
| `/api/v1/predictions/*`     | `prediction-service :8001`  |
| `/api/v1/market/*`          | `market-service :8002`      |
| `/api/v1/recommendations/*` | `recommendation-service :8003` |

Downstream URLs are configurable in `services/api-gateway/.env` with local defaults (`PREDICTION_SERVICE_URL`, `MARKET_SERVICE_URL`, `RECOMMENDATION_SERVICE_URL`). `GET /health` on the gateway reports the gateway's own status.

## Frontend configuration

The website calls the gateway with a single configurable base URL (set in `apps/web/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Redis caching

`market-service` and `recommendation-service` cache expensive read-only responses in Redis Cloud, so repeated identical requests are served without recomputing the underlying analytics / recommendations.

```
                        API Gateway
                             |
               +-------------+-------------+
               v                           v
         Market Service          Recommendation Service
               |                           |
               +-------------+-------------+
                             v
                        Redis Cloud
```

`prediction-service` and `api-gateway` do not use Redis and are unchanged. Caching lives inside the service that owns the data, never in the gateway.

### Configuration

Each caching service reads its Redis connection string from `REDIS_URL` (loaded through its Pydantic settings from `services/*/.env`). No credentials are committed — `.env` is git-ignored and `.env.example` only contains the placeholder `redis://localhost:6379/0`. The cache TTL is configurable via `REDIS_CACHE_TTL_SECONDS` (default `600`, i.e. 10 minutes).

### Cached endpoints

| Service                | Endpoint                          | Cache key                                            |
| ---------------------- | --------------------------------- | ---------------------------------------------------- |
| `market-service`       | `/api/v1/market/overview`         | `market:overview`                                    |
| `market-service`       | `/api/v1/market/sectors`          | `market:sectors`                                     |
| `market-service`       | `/api/v1/market/analytics`        | `market:analytics`                                   |
| `market-service`       | `/api/v1/market/insights`         | `market:insights`                                    |
| `recommendation-service`| `/api/v1/recommendations/location`| `recommendations:location:{landmark}:{radius}`       |
| `recommendation-service`| `/api/v1/recommendations/similar` | `recommendations:similar:{property_name}`            |
| `recommendation-service`| `/api/v1/recommendations/hybrid`  | `recommendations:hybrid:{property_name}:{preference}`|

Cache keys always include every request parameter that affects the response, so different queries never share an entry. Cached responses set an `X-Cache: HIT` / `X-Cache: MISS` header for easy verification; the response body is unchanged.

### Fallback behaviour

Redis is strictly optional. If `REDIS_URL` is unset, or Redis is unreachable / times out / errors, the service logs a single warning and continues serving requests by running the normal computation. Nothing is ever exposed from the connection string.

### Geo-cache vs Redis

`recommendation-service` keeps its existing local geo-cache (`GEO_CACHE_PATH=data/geo_cache.pkl`, plus `GEO_CACHE_OLD_PATH`). Redis is an *additional* application-level cache for the final API response — it does not replace or modify the geo-cache files or the underlying recommendation logic.

## Database and migrations (optional)

Prediction history persistence is optional and only affects `prediction-service`. Create a free PostgreSQL database at Neon or Supabase, put its connection string in `services/prediction-service/.env`, then run:

```powershell
cd services/prediction-service
alembic upgrade head
```

The initial migration creates a `prediction_requests` table for an audit trail. The price prediction endpoint works before configuring the database; persistence is intentionally optional during local UI development.
