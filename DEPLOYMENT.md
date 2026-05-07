# EDGAR Deployment

This repo ships two container images built from the root:

- `Dockerfile.backend` → `edgar-ui-backend` (FastAPI on port 8000)
- `Dockerfile.frontend` → `edgar-ui-frontend` (nginx serving the built React app on port 3000)

Both are built and pushed on every push to `main` by [.github/workflows/release.yml](.github/workflows/release.yml) to `ghcr.io/<owner>/edgar-ui-backend` and `.../edgar-ui-frontend`, tagged with the git tag (on release) or `latest` (on branch push).

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
| `AC_BASE_URL` | `"https://answercoalesce.renci.org"` | AnswerCoalesce base URL |
| `EDGAR_BASE_URL` | `"https://edgar.apps.renci.org"` | EDGAR's own public URL (used as callback URL for AC async queries) |
| `MAX_WAIT_SECONDS` | `3600` (60 min) | Hard cap on how long we'll poll AnswerCoalesce before force-failing the job |
| `POLL_INTERVAL_SECONDS` | `3` | How often we poll AC for status |

`NEO4J_*` and `REDIS_URL` appear in `app/core/config.py` but are not read by any running code today.

## Frontend Image

Two-stage build — `node:18-alpine` builds the Vite bundle, `nginx:alpine` serves `dist/` on port 3000. Nginx config is inlined in the Dockerfile with:

- Client-side routing fallback (`try_files $uri /index.html`) so refreshing on a sub-route still loads the app
- Gzip + standard security headers

The runtime `API_BASE_URL` is derived from `window.location` (see [frontend/src/utils/api.ts](frontend/src/utils/api.ts)) — same origin in production, `http://localhost:8000` in dev. The build output is therefore environment-agnostic.

## Current Production

- Hostname: `edgar.apps.renci.org`
- Upstream dependency: `answercoalesce.renci.org` — pipeline latency is dominated by AC, not EDGAR.

## Known Deployment Caveats

1. **Single worker ceiling.** One active pipeline per pod at a time (async still lets many jobs interleave while waiting on AC, so throughput isn't as bad as "one user at a time").
2. **Non-durable jobs.** A pod restart drops every in-flight job; users see them as never completing. No recovery path — the `ac_job_id` is only in memory.
3. **Memory growth.** Large TRAPI results stay resident; there's no TTL or eviction. Restart pods periodically until the Redis store lands.
4. **Poll timeout hard cap.** Jobs exceeding `MAX_WAIT_SECONDS` (default 60 min, overridable via env) are force-failed with "Try a simpler query" even if AC is still working. Bump the env var on the deployment for queries that legitimately take longer.
5. **No AC cancellation on client disconnect.** If a user closes the tab mid-job, AC keeps computing.

## Migration Path

- **Phase 1 (done).** `--workers 1` in [Dockerfile.backend](Dockerfile.backend).
- **Phase 2.** Redis-backed `JobStore`: hash per job, blob per result, pub/sub for WebSocket fanout. Unlocks multi-worker and pod restart recovery.
- **Phase 3.** Configurable timeout, result TTL, cancel endpoint that forwards to AC's `/query/cancel`, real stage-level progress from AC status payload.

## Running Images Locally

```bash
docker build -f Dockerfile.backend -t edgar-ui-backend:local .
docker build -f Dockerfile.frontend -t edgar-ui-frontend:local .

docker run --rm -p 8000:8000 -e SECRET_KEY=dev edgar-ui-backend:local
docker run --rm -p 3000:3000 edgar-ui-frontend:local
```

With both running, the frontend at http://localhost:3000 will try to reach `/api/v1` on its own origin — so for end-to-end local testing you'll need a reverse proxy (or just run backend + frontend directly as in the root README's Quick Start).

## Cluster Deployment

The Kubernetes manifests live in [helm/edgar-ui](helm/edgar-ui/). Chart layout:

- `templates/backend-deployment.yaml`, `backend-service.yaml`
- `templates/frontend-deployment.yaml`, `frontend-service.yaml`
- `templates/ingress.yaml` — routes `/api` to the backend service and `/` to the frontend, TLS via cert-manager
- `values.yaml` — namespace, image repos/tags, resources, ingress host

Both images use `tag: latest` with `pullPolicy: Always`, so a rollout restart is enough to pick up a fresh build.

### First-time install

```bash
# 1. make sure you're pointed at the right cluster / context
kubectl config current-context

# 2. create the namespace if it doesn't exist yet
kubectl create namespace <your-namespace>

# 3. install the chart
helm install edgar-ui ./helm/edgar-ui -n <your-namespace>

# 4. verify everything is up
kubectl get pods,svc,ingress -n <your-namespace>
```

Once pods are `Running` and the ingress has an address, the app is reachable at the host defined in `values.yaml` (`ingress.hosts[].host`).

### Updating config or manifests

When you change `values.yaml` or a template:

```bash
helm upgrade edgar-ui ./helm/edgar-ui -n <your-namespace>
```

### Redeploying after a new image build

After `main` is updated and the release workflow finishes pushing new `latest` images, roll the pods to pick them up:

```bash
kubectl rollout restart deployment edgar-ui-backend  -n <your-namespace>
kubectl rollout restart deployment edgar-ui-frontend -n <your-namespace>
```
