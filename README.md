# Gurgaon Project

A service-oriented rewrite of the Gurgaon flat analysis app. A Next.js interface talks to three independent FastAPI services over HTTP.

```
Gurgaon Project/
  apps/web/                        # Next.js 16 interface
  services/
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

1. Prediction service:

   ```powershell
   cd services/prediction-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8001
   ```

2. Market service:

   ```powershell
   cd services/market-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8002
   ```

3. Recommendation service:

   ```powershell
   cd services/recommendation-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8003
   ```

4. Start the website:

   ```powershell
   cd apps/web
   Copy-Item .env.local.example .env.local
   npm install
   npm run dev
   ```

Open `http://localhost:3000` (redirects to `/prediction`). Each service exposes FastAPI docs at its own `/docs`.

## Model and data

The ML model is downloaded from Hugging Face Hub (`iamAryan/gurgaon-property-price-model`) at prediction-service startup. No token is required because the repository is public. If the model cannot be downloaded, the prediction endpoints return `503` rather than fabricating predictions. The prediction form's dropdowns are populated from the model's own encoder categories via `GET /api/v1/predictions/options`, so the UI can never drift from the trained feature space.

Market and recommendation datasets are bundled inside their owning services under `data/`.

## Frontend configuration

The website calls the three services directly using separate configurable URLs (set in `apps/web/.env.local`):

```
NEXT_PUBLIC_PREDICTION_API_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_MARKET_API_URL=http://localhost:8002/api/v1
NEXT_PUBLIC_RECOMMENDATION_API_URL=http://localhost:8003/api/v1
```

## Database and migrations (optional)

Prediction history persistence is optional and only affects `prediction-service`. Create a free PostgreSQL database at Neon or Supabase, put its connection string in `services/prediction-service/.env`, then run:

```powershell
cd services/prediction-service
alembic upgrade head
```

The initial migration creates a `prediction_requests` table for an audit trail. The price prediction endpoint works before configuring the database; persistence is intentionally optional during local UI development.
