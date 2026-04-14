# EDGAR Deployment

This repo ships two container images built from the root:

- `Dockerfile.backend` → `edgar-backend` (FastAPI on port 8000)
- `Dockerfile.frontend` → `edgar-frontend` (nginx serving the built SPA on port 3000)

Both are built and pushed on every push to `main` by [.github/workflows/release.yml](.github/workflows/release.yml) to `ghcr.io/<owner>/edgar-backend` and `.../edgar-frontend`, tagged with the git tag (on release) or `latest` (on branch push).

## Backend Image

The backend image runs:

```
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --timeout-keep-alive 300
```

### Why `--workers 1`

Job state (status, logs, TRAPI results, notifications) is held in the Python process. With multiple workers, `POST /analyze` lands on worker A while subsequent `GET /status/{job_id}` polls round-robin across workers B–D — three out of four polls can't see the job. The frontend sees "Network Error" or stale state even though the pipeline is running.

This is a tactical cap. The planned fix is a Redis-backed job store; after that, `--workers N` and horizontal pod scaling become safe.

### Environment Variables

| Var | Default | Notes |
|---|---|---|
| `SECRET_KEY` | `"change-this-in-production"` | JWT signing key — **must** be set in prod |

`NEO4J_*` and `REDIS_URL` appear in `app/core/config.py` but are not read by any running code today.

### Health / Readiness

No dedicated health endpoint yet. The frontend nginx image exposes `/health`; the backend does not.

## Frontend Image

Two-stage build — `node:18-alpine` builds the Vite bundle, `nginx:alpine` serves `dist/` on port 3000. Nginx config is inlined in the Dockerfile with:

- SPA fallback (`try_files $uri /index.html`)
- Gzip + standard security headers
- `/health` for liveness

The runtime `API_BASE_URL` is derived from `window.location` (see [frontend/src/utils/api.ts](frontend/src/utils/api.ts)) — same origin in production, `http://localhost:8000` in dev. The build output is therefore environment-agnostic.

## Current Production (test cluster)

- Hostname: `edgar-test.apps.renci.org`
- Upstream dependency: `answercoalesce-test.apps.renci.org` — pipeline latency is dominated by AC, not EDGAR.

## Known Deployment Caveats

1. **Single worker ceiling.** One active pipeline per pod at a time (async still lets many jobs interleave while waiting on AC, so throughput isn't as bad as "one user at a time").
2. **Non-durable jobs.** A pod restart drops every in-flight job; users see them as never completing. No recovery path — the `ac_job_id` is only in memory.
3. **Memory growth.** Large TRAPI results stay resident; there's no TTL or eviction. Restart pods periodically until the Redis store lands.
4. **30-minute hard cap.** Jobs exceeding `MAX_WAIT_SECONDS` (30 min) are force-failed with "Try a simpler query" even if AC is still working.
5. **No AC cancellation on client disconnect.** If a user closes the tab mid-job, AC keeps computing.

## Migration Path

- **Phase 1 (done).** `--workers 1` in [Dockerfile.backend](Dockerfile.backend).
- **Phase 2.** Redis-backed `JobStore`: hash per job, blob per result, pub/sub for WebSocket fanout. Unlocks multi-worker and pod restart recovery.
- **Phase 3.** Configurable timeout, result TTL, cancel endpoint that forwards to AC's `/query/cancel`, real stage-level progress from AC status payload.

## Running Images Locally

```bash
docker build -f Dockerfile.backend -t edgar-backend:local .
docker build -f Dockerfile.frontend -t edgar-frontend:local .

docker run --rm -p 8000:8000 -e SECRET_KEY=dev edgar-backend:local
docker run --rm -p 3000:3000 edgar-frontend:local
```

With both running, the SPA at http://localhost:3000 will try to reach `/api/v1` on its own origin — so for end-to-end local testing you'll need a reverse proxy (or just run backend + frontend directly as in the root README's Quick Start).
