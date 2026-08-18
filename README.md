# Gurgaon Project

A service-oriented rewrite of the Gurgaon flat analysis app. A Next.js interface talks to three independent FastAPI services over HTTP.

```
Gurgaon Project/
  apps/web/                        # Next.js 16 interface
  services/
    api-gateway/                   # single backend entry point (proxy/router)   :8000
    public-load-balancer/          # public Nginx reverse proxy (external entry) :80
    prediction-load-balancer/      # internal Nginx in front of prediction       :8001 (internal)
    prediction-service/            # ML inference + publishes prediction events  :8001 (x2 replicas)
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
| `public-load-balancer`    | 80   | public entry point; Nginx reverse proxy routing `/` → web and `/api/` → gateway |
| `api-gateway`             | 8000 | single entry point; routes `/api/v1/*` to the services below (proxying only) |
| `prediction-load-balancer`| 8001 (internal) | Nginx reverse proxy; round-robins prediction requests across the two replicas |
| `prediction-service`      | 8001 | `/api/v1/predictions`, `/api/v1/predictions/options`, HF model loading/inference, publishes `prediction_created` events (runs as two replicas: `prediction-service-1`, `prediction-service-2`) |
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
                        Internet
                           │
                           ▼
                   Public Nginx :80 (public-load-balancer)
                      /            \
                     /              \
                    ▼                ▼
             Next.js (web) :3000   API Gateway :8000
                                       │
                                       ▼
                                Prediction LB :8001 ──► RabbitMQ (CloudAMQP)
                                   /          \
                                  ▼            ▼
                  prediction-service-1 :8001   prediction-service-2 :8001
                                       │
                                       ├──► Market Service :8002 ──► Redis (Redis Cloud)
                                       └──► Recommendation Service :8003 ──► Redis (Redis Cloud)
                                                ▲                              │
                                                │                              ▼
                                                └────── Prediction Consumer (no port) ──► Neon PostgreSQL
```

- **Docker containers:** Public Nginx, Next.js, API Gateway, Prediction Load Balancer (Nginx), Prediction Service ×2 replicas, Market Service, Recommendation Service, Prediction Consumer.
- **External managed services:** Redis Cloud, CloudAMQP (RabbitMQ), Neon PostgreSQL, Hugging Face. These are never run inside Compose.

The **public Nginx** (`public-load-balancer`) is the only container exposed to the host (port `80`). Everything else is reached over the Docker network using service names.

### Public Nginx vs. Internal Prediction Nginx

There are two distinct Nginx containers, and they serve different purposes:

| Nginx                     | Role                                                        | Exposed |
| ------------------------- | ----------------------------------------------------------- | ------- |
| `public-load-balancer`    | external entry point / reverse proxy (Internet → app)        | `80:80` |
| `prediction-load-balancer`| internal load balancer across `prediction-service` replicas  | none    |

- **Public Nginx** (`services/public-load-balancer/nginx.conf`) listens on port `80` and is the single external entry point. It routes `/` to `web:3000` (Next.js) and `/api/` to `api-gateway:8000`, preserving the request method, query string, headers and body. It also serves a static `/health` endpoint and contains no business logic.
- **Internal Prediction Nginx** (`services/prediction-load-balancer/nginx.conf`) listens on port `8001` inside the Docker network and round-robins `/api/v1/predictions/*` requests across `prediction-service-1` and `prediction-service-2`. It is unchanged by the public load balancer.

Market and recommendation requests continue to flow through the API Gateway: `Public Nginx → API Gateway → { Market Service, Recommendation Service, Prediction Load Balancer }`.

### Prerequisites

- Docker (with the Compose v2 plugin, i.e. `docker compose` works).
- Network access to the external services (Hugging Face for the model, CloudAMQP, Neon, Redis Cloud).

### Configure environment variables

Each service reads its variables from its own git-ignored `.env` file, wired into the container via `env_file` in `docker-compose.yml`:

```powershell
Copy-Item services/prediction-service/.env.example    services/prediction-service/.env
Copy-Item services/prediction-consumer/.env.example   services/prediction-consumer/.env
Copy-Item services/market-service/.env.example        services/market-service/.env
Copy-Item services/recommendation-service/.env.example services/recommendation-service/.env
```

Then edit each `.env` and fill in the real connection strings:

| File                              | Variable(s)                                    | Notes                                    |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| `services/prediction-service/.env`   | `RABBITMQ_URL`                               | leave empty to skip async persistence    |
| `services/prediction-consumer/.env`  | `RABBITMQ_URL`, `DATABASE_URL`               | both required for the consumer to start  |
| `services/market-service/.env`       | `REDIS_URL`                                  | Redis Cloud; leave empty to disable caching |
| `services/recommendation-service/.env`| `REDIS_URL`                                  | Redis Cloud; leave empty to disable caching |

A root `.env` (next to `docker-compose.yml`) is optional and only carries non-secret overrides such as `REDIS_CACHE_TTL_SECONDS`, `MODEL_REPO_ID`, and `MODEL_FILENAME` (all of which already have sane defaults in `docker-compose.yml`). No credentials are ever committed — `.env` is git-ignored and only `.env.example` files are tracked, and no `.env` file is copied into any image (each `.dockerignore` excludes `.env`).

### Running

```powershell
docker compose build       # build all images
docker compose up --build  # build (if needed) and start the complete local application
docker compose down        # stop and remove the containers
```

`docker compose up --build` starts the public Nginx, the frontend, the gateway, the prediction load balancer, both prediction-service replicas, the market and recommendation services, and the prediction consumer together. The public Nginx is the external entry point on port `80`: `/` is served by Next.js (`web`) and `/api/` is proxied to the gateway, which proxies `/api/v1/*` to the correct backend service over the Docker network. Prediction requests are distributed across the two replicas by the load balancer (see [Load balancing & horizontal scaling](#load-balancing--horizontal-scaling)).

### Database migrations (one-off)

The `prediction_requests` table must exist before the consumer can persist anything. Run the Alembic migration once (the consumer image already ships `alembic` and the migration files):

```powershell
docker compose run --rm prediction-consumer alembic upgrade head
```

### Ports

| Container             | Container port | Host port | Notes                                        |
| --------------------- | -------------- | --------- | -------------------------------------------- |
| `public-load-balancer`| 80             | 80        | external entry point; Nginx reverse proxy     |
| `web`                 | 3000           | —         | Next.js interface (reached via public Nginx) |
| `api-gateway`         | 8000           | —         | single HTTP entry point for the backend      |
| `prediction-load-balancer` | 8001      | —         | internal only; Nginx in front of the replicas |
| `prediction-service-1` | 8001          | —         | internal only (reached via the load balancer) |
| `prediction-service-2` | 8001          | —         | internal only (reached via the load balancer) |
| `market-service`      | 8002           | —         | internal only (reached via the gateway)      |
| `recommendation-service` | 8003        | —         | internal only (reached via the gateway)      |
| `prediction-consumer` | —              | —         | worker; no HTTP port                        |

Only the public Nginx is exposed to the host (port `80`); everything else is reachable only inside the `gurgaon` network using Docker service names (e.g. the gateway calls `http://prediction-load-balancer:8001`, which forwards to `prediction-service-1` / `prediction-service-2`).

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
| `/api/v1/predictions/*`     | `prediction-load-balancer :8001` (→ prediction replicas) |
| `/api/v1/market/*`          | `market-service :8002`      |
| `/api/v1/recommendations/*` | `recommendation-service :8003` |

Downstream URLs are configurable in `services/api-gateway/.env` with local defaults (`PREDICTION_SERVICE_URL`, `MARKET_SERVICE_URL`, `RECOMMENDATION_SERVICE_URL`). In Docker Compose, `PREDICTION_SERVICE_URL` is overridden to `http://prediction-load-balancer:8001` so prediction traffic is load balanced across replicas. `GET /health` on the gateway reports the gateway's own status.

## Load balancing & horizontal scaling

The `prediction-service` is the first service to be horizontally scaled: it is stateless (no per-request state, no session, no local database, and the model is fetched from Hugging Face at startup rather than baked into the image), so it can run as many identical replicas as needed. Redis Cloud, CloudAMQP, Neon PostgreSQL and Hugging Face remain shared external services.

```
                    API Gateway :8000
                         │
                         ▼
             Prediction Load Balancer (Nginx) :8001  ← internal only
                    /            \
                   ▼              ▼
        prediction-service-1   prediction-service-2   (same image & config)
                   \              /
                    \            /
                         ▼
                     RabbitMQ (CloudAMQP)
                         │
                         ▼
                 Prediction Consumer
                         │
                         ▼
                   Neon PostgreSQL
```

### How it works

- A lightweight **Nginx** container (`prediction-load-balancer`) sits between the gateway and the two `prediction-service` replicas. It accepts HTTP requests for the prediction service and forwards them to the replicas using **round-robin** (`upstream` block in `services/prediction-load-balancer/nginx.conf`). It runs with a single worker process so round-robin is deterministic, and logs the `$upstream_addr` of each request for easy verification.
- Both replicas are built from the same image (`build: ./services/prediction-service`) and read the same `.env`, so they share identical configuration. No Dockerfile or application source code is duplicated — the replica definition is declared once as a shared YAML anchor (`x-prediction-service`) in `docker-compose.yml` and referenced by `prediction-service-1` and `prediction-service-2`.
- The replicas and the load balancer are **internal only** (no host ports); they are reached exclusively through the gateway, so the public architecture (`Browser → API Gateway :8000 → …`) and the frontend API contract are unchanged.
- The load balancer uses Nginx passive health checks (`max_fails`/`fail_timeout`, plus a short `proxy_connect_timeout`): a replica that stops answering is marked down and skipped until it recovers.

### Starting the scaled architecture

The scaled setup uses the normal Compose commands (both replicas start by default):

```powershell
docker compose build
docker compose up --build
```

`docker compose ps` shows both `prediction-service-1` and `prediction-service-2` running and healthy.

### Verifying round-robin distribution

The load balancer logs each request together with the replica that served it (the `access_log` format in `nginx.conf` appends `-> <replica>:8001`). Send several prediction requests through the gateway, then inspect the load balancer's log:

```powershell
for ($i=1; $i -le 6; $i++) {
  curl.exe -s -o NUL -X POST http://localhost:8000/api/v1/predictions `
    -H "Content-Type: application/json" --data-binary "@payload.json"
  Start-Sleep -Milliseconds 300
}
docker logs gurgaonproject-prediction-load-balancer-1
```

The `POST` lines alternate between the two replicas' addresses (the `-> 172.x.0.3:8001` vs `-> 172.x.0.4:8001` suffix is the replica that handled each request):

```
POST /api/v1/predictions ... -> 172.19.0.3:8001   (prediction-service-2)
POST /api/v1/predictions ... -> 172.19.0.4:8001   (prediction-service-1)
POST /api/v1/predictions ... -> 172.19.0.3:8001   (prediction-service-2)
POST /api/v1/predictions ... -> 172.19.0.4:8001   (prediction-service-1)
```

You can also inspect each replica directly (`docker logs prediction-service-1` / `docker logs prediction-service-2`), which shows the same requests split across the two containers. No replica-identifying fields are added to the prediction response — verification is done purely via logs, so the API schema is unchanged.

### Simulating a replica failure

```powershell
docker stop prediction-service-1    # stop one replica
# requests keep working through prediction-service-2
docker start prediction-service-1   # bring it back
```

When a replica stops, Nginx's passive health check (`max_fails=2 fail_timeout=30s`) marks it down after a couple of failed connections and routes everything to the healthy replica; a short `proxy_connect_timeout 2s` keeps that failover fast. After the replica returns (and `fail_timeout` elapses, ~30s) Nginx re-enables it and round-robin resumes. This is basic passive failover — no retries, circuit breakers, autoscaling, or advanced failover logic are implemented in this phase.

### Load balancing vs. RabbitMQ consumer scaling

These are two different distribution concerns and should not be confused:

- **Load Balancer** distributes **synchronous HTTP requests** across multiple replicas of a stateless service (`prediction-service`) so the API can serve more traffic. It is application-agnostic and lives at the HTTP edge.
- **RabbitMQ** distributes **asynchronous messages** (`prediction_created` events) from producers to consumers. Each prediction publishes exactly one event, regardless of which replica handled the HTTP request; the single `prediction-consumer` consumes the shared queue and persists to Neon. Scaling the consumer is a separate concern (more consumers competing on the same queue), not covered in this phase.

## Frontend configuration

The website calls the gateway with a single configurable base URL. For local development it is set in `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

In the Docker/AWS deployment, the browser reaches both the frontend and the API through the same public origin (the public Nginx on port `80`), so the Compose build argument is set to `http://<public-ip>/api/v1` — see `NEXT_PUBLIC_API_URL` in the `web` service of `docker-compose.yml`. The frontend API functions and paths are unchanged; only the base URL differs.

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

Each caching service reads its Redis connection string from the `REDIS_URL` environment variable, which Docker Compose injects from `services/market-service/.env` / `services/recommendation-service/.env` via `env_file`. No credentials are committed — `.env` is git-ignored and `.env.example` only contains the placeholder `redis://localhost:6379/0`. The cache TTL is configurable via `REDIS_CACHE_TTL_SECONDS` (default `600`, i.e. 10 minutes).

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
