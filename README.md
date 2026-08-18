# Gurgaon Project

A service-oriented rewrite of the Gurgaon flat analysis app. A Next.js interface talks to three independent FastAPI services over HTTP.

```
Gurgaon Project/
  apps/web/                        # Next.js 16 interface
  services/
    api-gateway/                   # single backend entry point (proxy/router)   :8000
    prediction-service/            # ML inference + publishes prediction events  :8001
    prediction-consumer/           # consumes events, persists to PostgreSQL     (no port)
    market-service/                # market analytics / insights                 :8002
    recommendation-service/        # society / landmark recommendations          :8003
```

## Stack

- **Frontend:** Next.js 16 (App Router, JavaScript/JSX) + Plotly + Leaflet
- **Services:** FastAPI + Pydantic (one per domain)
- **Messaging:** RabbitMQ (CloudAMQP or local Docker) for async prediction persistence
- **Database:** PostgreSQL (Neon free tier) with SQLAlchemy + Alembic, owned by `prediction-consumer`
- **Model:** hosted on Hugging Face (`iamAryan/gurgaon-property-price-model`), downloaded at startup

## Services and ports

| Service                   | Port | Responsibilities                                                                 |
| ------------------------- | ---- | ------------------------------------------------------------------------------- |
| `api-gateway`             | 8000 | single entry point; routes `/api/v1/*` to the three services below (proxying only) |
| `prediction-service`      | 8001 | `/api/v1/predictions`, `/api/v1/predictions/options`, HF model loading/inference, publishes `prediction_created` events |
| `prediction-consumer`     | —    | consumes `prediction_created` from RabbitMQ, persists audit records to PostgreSQL |
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

3. Prediction consumer (optional — only needed for async persistence):

   ```powershell
   cd services/prediction-consumer
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   alembic upgrade head
   python -m app.consumer
   ```

4. Market service:

   ```powershell
   cd services/market-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8002
   ```

5. Recommendation service:

   ```powershell
   cd services/recommendation-service
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e .
   Copy-Item .env.example .env
   uvicorn app.main:app --reload --port 8003
   ```

6. Start the website:

   ```powershell
   cd apps/web
   Copy-Item .env.local.example .env.local
   npm install
   npm run dev
   ```

Open `http://localhost:3000` (redirects to `/prediction`). Each service and the gateway expose FastAPI docs at their own `/docs`.

## Docker

Instead of starting each service in its own terminal (see [Run locally](#run-locally)), the whole system can be started with Docker Compose. Docker builds one container per component, connects them on a shared network, and talks to the four external managed services (Redis Cloud, CloudAMQP, Neon PostgreSQL, Hugging Face) through environment variables — those are **not** containerized.

### Architecture

```
                        Docker (gurgaon network)
   ┌──────────────────────────────────────────────────────────────┐
   │                                                              │
   │   Next.js (web) ──:3000──► API Gateway ──:8000──┬──► Prediction Service :8001 ──► RabbitMQ (CloudAMQP)
   │                                                 ├──► Market Service :8002 ──► Redis (Redis Cloud)
   │                                                 └──► Recommendation Service :8003 ──► Redis (Redis Cloud)
   │                                                          ▲                              │
   │                                                          │                              ▼
   │                                                          └──────── Prediction Consumer (no port) ──► Neon PostgreSQL
   │                                                                                              │
   └──────────────────────────────────────────────────────────────┘
                                                                                                 │
   Hugging Face (model download at startup) ◄── Prediction Service                              │
   Neon PostgreSQL ◄─────────────────────────────────────────────────────────────────────────────┘
```

- **Docker containers:** Next.js, API Gateway, Prediction Service, Market Service, Recommendation Service, Prediction Consumer.
- **External managed services:** Redis Cloud, CloudAMQP (RabbitMQ), Neon PostgreSQL, Hugging Face. These are never run inside Compose.

### Prerequisites

- Docker (with the Compose v2 plugin, i.e. `docker compose` works).
- Network access to the external services (Hugging Face for the model, CloudAMQP, Neon, Redis Cloud).

### Configure environment variables

Environment variables are read from two places:

1. **prediction-service** and **prediction-consumer** read their variables directly from their own `.env` files (wired via `env_file` in `docker-compose.yml`):

   ```powershell
   Copy-Item services/prediction-service/.env.example services/prediction-service/.env
   Copy-Item services/prediction-consumer/.env.example services/prediction-consumer/.env
   ```

   - `services/prediction-service/.env` → `RABBITMQ_URL` (leave empty to skip async persistence)
   - `services/prediction-consumer/.env` → `RABBITMQ_URL` and `DATABASE_URL` (both required for the consumer to start)

2. **market-service** and **recommendation-service** read their Redis connection string from a root `.env` file (next to `docker-compose.yml`):

   ```powershell
   Copy-Item .env.example .env
   ```

   Then edit `.env` and fill in the real connection string:

   | Variable       | Used by                                          | Notes                                    |
   | -------------- | ------------------------------------------------ | ---------------------------------------- |
   | `REDIS_URL`    | market-service, recommendation-service           | Redis Cloud; leave empty to disable caching |

The Hugging Face model repository (`MODEL_REPO_ID` / `MODEL_FILENAME`) has sane defaults already baked into `docker-compose.yml`, so no configuration is required for it. No credentials are ever committed — `.env` is git-ignored and only `.env.example` files are tracked, and no `.env` file is copied into any image (each `.dockerignore` excludes `.env`).

### Running

```powershell
docker compose build       # build all six images
docker compose up --build  # build (if needed) and start the complete local application
docker compose down        # stop and remove the containers
```

`docker compose up --build` starts the frontend, the gateway, all three backend services, and the prediction consumer together. The frontend is served at `http://localhost:3000` and calls the gateway, which proxies `/api/v1/*` to the correct backend service over the Docker network.

### Database migrations (one-off)

The `prediction_requests` table must exist before the consumer can persist anything. Run the Alembic migration once (the consumer image already ships `alembic` and the migration files):

```powershell
docker compose run --rm prediction-consumer alembic upgrade head
```

### Ports

| Container             | Container port | Host port | Notes                                        |
| --------------------- | -------------- | --------- | -------------------------------------------- |
| `web`                 | 3000           | 3000      | Next.js interface                            |
| `api-gateway`         | 8000           | 8000      | single HTTP entry point for the backend      |
| `prediction-service`  | 8001           | —         | internal only (reached via the gateway)      |
| `market-service`      | 8002           | —         | internal only (reached via the gateway)      |
| `recommendation-service` | 8003        | —         | internal only (reached via the gateway)      |
| `prediction-consumer` | —              | —         | worker; no HTTP port                        |

Only the frontend and the gateway are exposed to the host; everything else is reachable only inside the `gurgaon` network using Docker service names (e.g. the gateway calls `http://prediction-service:8001`).

### Prediction consumer

The consumer runs as a worker process (`python -m app.consumer`), not an HTTP server, so it exposes no port and has no health endpoint. It connects to CloudAMQP, consumes `prediction_created` events from the durable `prediction_created` queue, validates each event, writes the audit record to Neon PostgreSQL, and only then acknowledges the message (failed writes are nacked/requeued).

### Docker vs. existing local development

The Docker setup is a convenience wrapper around the same code — it does not change the architecture or business logic. The per-terminal workflow in [Run locally](#run-locally) still works exactly as before; the two approaches can coexist.

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

## Async messaging (RabbitMQ)

Predictions are returned synchronously, but their audit trail is persisted asynchronously through RabbitMQ so the price API never waits on the database.

```
        Next.js
          |
          v
     API Gateway
          |
          v
   Prediction Service -------------------> HTTP response (predicted price)
          |
          |  prediction_created event
          v
      CloudAMQP / RabbitMQ
          |
          v
   Prediction Consumer
          |
          v
      Neon PostgreSQL
```

The flow is `producer → exchange → queue → consumer`:

1. `prediction-service` runs the ML inference and returns the predicted price immediately.
2. After a successful prediction it publishes a `prediction_created` event to the **topic exchange** `prediction_events` with routing key `prediction_created`.
3. The durable queue `prediction_created` is bound to that routing key, so the event lands in the queue.
4. `prediction-consumer` consumes the queue, validates the event, persists the audit record to Neon PostgreSQL, and only then acknowledges the message.

A topic exchange routes on the event name (routing key), so it behaves like a `direct` exchange today while leaving room to add more event types later without adding exchanges.

### Configuration

`prediction-service` and `prediction-consumer` both read the broker URL from `RABBITMQ_URL` (loaded from `services/*/.env`). No credentials are committed — `.env` is git-ignored and `.env.example` only contains the empty placeholder `RABBITMQ_URL=`. Switching between CloudAMQP and a local broker is just an environment-variable change.

### CloudAMQP vs local RabbitMQ

Use the CloudAMQP URL you were given as `RABBITMQ_URL`. To run a broker locally instead, start RabbitMQ with Docker:

```powershell
docker run -d --name rabbitmq -p 5672:5672 rabbitmq:3-management
```

then set:

```
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
```

No other part of the application requires Docker.

### Failure handling

- If `RABBITMQ_URL` is unset, or the broker is unreachable, `prediction-service` logs a single generic warning and still returns the prediction normally. The credentials are never logged.
- The consumer uses manual acknowledgements: it acks a message only after the PostgreSQL write commits successfully. If persistence fails it nacks (requeues) the message so RabbitMQ redelivers it — failed writes are never silently lost. Messages are published as persistent, so they also survive a consumer restart.

## Database and migrations

Persistence is owned by `prediction-consumer`. Create a free PostgreSQL database at Neon, put its connection string in `services/prediction-consumer/.env` as `DATABASE_URL`, then run:

```powershell
cd services/prediction-consumer
alembic upgrade head
```

The initial migration creates a `prediction_requests` table (`request_payload`, `predicted_price_crore`, `created_at`) for the audit trail. The consumer exits with a clear error if `DATABASE_URL` is unset, and the price prediction endpoint works without any database configured — persistence is intentionally optional during local UI development.
