# Gurgaon Project

A clean, service-ready rewrite of the Gurgaon flat analysis app.

```
Gurgaon Project/
  apps/web/                 # Next.js 16 interface
  services/prediction-api/  # FastAPI prediction service
  packages/model/           # Runtime model artifact only
```

## Stack

- **Frontend:** Next.js 16 (App Router, JavaScript/JSX) + Plotly
- **API:** FastAPI + Pydantic
- **Database:** PostgreSQL (use Neon or Supabase free tier) with SQLAlchemy + Alembic (optional)
- **Model:** the existing `property_price_model.pkl` (sklearn Pipeline, loaded at startup)

## Features

The web app exposes four routes under a shared sticky navbar:

| Route            | Feature                                                        |
| ---------------- | -------------------------------------------------------------- |
| `/prediction`    | Price prediction using the real trained model                  |
| `/analysis`      | Sector comparison, bivariate analysis, price drivers           |
| `/recommendation`| Landmark / similar / hybrid society recommendations            |
| `/insights`      | Market statistics, price drivers and a what-if studio          |

## Run locally

1. Start the API:

   ```powershell
   cd services/prediction-api
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8000
   ```

2. Start the website in another terminal:

   ```powershell
   cd apps/web
   Copy-Item .env.local.example .env.local
   npm install
   npm run dev
   ```

Open `http://localhost:3000` (redirects to `/prediction`). The FastAPI docs are at `http://localhost:8000/docs`.

## Model and data

The model, market dataset and recommendation data are read from `packages/` at startup. If the model file is missing, the API refuses to start (or returns `503`) rather than fabricating predictions. The prediction form's dropdowns are populated from the model's own encoder categories via `GET /api/v1/predictions/options`, so the UI can never drift from the trained feature space.

## Database and migrations

Create a free PostgreSQL database at Neon or Supabase, put its connection string in `services/prediction-api/.env`, then run:

```powershell
cd services/prediction-api
alembic upgrade head
```

The initial migration creates a `prediction_requests` table for an audit trail. The price prediction endpoint works before configuring the database; persistence is intentionally optional during local UI development.

## Service boundaries

`prediction-api` owns inference and prediction history. Future services such as `market-data-api` or `recommendations-api` can live alongside it under `services/`, with the web app consuming them through their public APIs.
