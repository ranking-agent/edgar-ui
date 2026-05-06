# EDGAR Backend

FastAPI service that proxies TRAPI queries to [AnswerCoalesce](https://answercoalesce.renci.org/docs) and tracks job status for the EDGAR UI.

## Tech Stack

- **FastAPI** (async) with Uvicorn
- **httpx** for outbound calls to AnswerCoalesce
- **JWT** auth (dev: `demo / demo`)
- **Pydantic** for TRAPI models

## How It Works

```
Client ──POST /analyze──▶ FastAPI ──POST /query/async──▶ AnswerCoalesce
                            │
                            │  (asyncio.create_task)
                            ▼
                       poll /query/status
                            │
                            ▼
                       GET /query/result
                            │
                            ▼
                     store in-process
Client ◀─GET /status── FastAPI
Client ◀─GET /results─ FastAPI
```

Job state (queued/running/completed, logs, results) lives in the Python process — see `EnrichmentService` in [app/services/enrichment_service.py](app/services/enrichment_service.py). This means:

- A pod restart loses all in-flight jobs.
- Only one worker can be used per pod (see [DEPLOYMENT.md](../DEPLOYMENT.md)).
- Large result blobs stay resident until the process exits.

Swapping this for Redis-backed storage is the next planned change.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

Optional environment variables (see [app/core/config.py](app/core/config.py)):

- `SECRET_KEY` — JWT signing key (change in production)

Neo4j / Redis variables are present in the settings file but unused by the current implementation.

## Running

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is served at `http://localhost:8000/api/v1` and interactive docs at `http://localhost:8000/api/docs` (when enabled).

## API Endpoints

All endpoints require a Bearer token from `/auth/login`.

### Authentication

- `POST /api/v1/auth/login` — returns JWT
- `POST /api/v1/auth/logout`

### Enrichment Analysis

- `POST /api/v1/enrichment/analyze` — submit TRAPI query, returns `job_id`
- `GET /api/v1/enrichment/status/{job_id}` — job status + pipeline logs
- `GET /api/v1/enrichment/results/{job_id}` — full TRAPI response from AC
- `GET /api/v1/enrichment/history` — user's recent jobs
- `GET /api/v1/enrichment/notifications` — unseen completed-job notifications
- `POST /api/v1/enrichment/notifications/{job_id}/seen`

### WebSocket

- `WS /ws/job/{job_id}` — defined server-side; the current UI uses 3-second polling instead.

## TRAPI Query Format

```json
{
  "message": {
    "query_graph": {
      "nodes": {
        "n0": { "ids": ["MONDO:0005148"], "categories": ["biolink:Disease"] },
        "n1": { "categories": ["biolink:Drug"] }
      },
      "edges": {
        "e0": { "subject": "n0", "object": "n1", "predicates": ["biolink:treats"] }
      }
    }
  },
  "parameters": {
    "pvalue_threshold": 1e-5,
    "max_results": 100
  }
}
```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py                # auth / service DI
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   └── enrichment.py  # analyze / status / results / history / notifications
│   │       └── router.py
│   ├── core/
│   │   └── config.py              # settings
│   ├── models/
│   │   └── enrichment.py          # Pydantic TRAPI models
│   ├── services/
│   │   └── enrichment_service.py  # AC proxy + in-process job store
│   └── main.py
└── requirements.txt
```

## Notes

- `app/db/neo4j.py` and `app/db/redis.py` are stubs — no real connections.
- `app/docker-compose.yml` references Celery/Neo4j/Redis but does not reflect the current runtime; treat as historical.
- No `tests/` directory yet.
