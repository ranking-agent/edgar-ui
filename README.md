# EDGAR — Enrichment-Driven GrAph Reasoner

A web application for biomedical link prediction using enrichment analysis over knowledge graphs, built on the TRAPI (Translator Reasoner API) standard.

![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square) ![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=flat-square)

## Overview

EDGAR is a link-prediction platform for biomedical knowledge graphs, supporting:

- **Drug Repurposing** — drugs that may treat a disease
- **Gene Discovery** — genes associated with conditions
- **Function Prediction** — biological processes for genes
- **Pathway Analysis** — pathways involving specific genes
- **Target Identification** — gene targets for chemical compounds

## Architecture

EDGAR forwards TRAPI queries to [AnswerCoalesce](https://answercoalesce-test.apps.renci.org) (AC), polls for completion, and surfaces the results through a React UI.

- **Backend** — FastAPI (async) that proxies AC's async query API and tracks job state. See [backend/README.md](backend/README.md).
- **Frontend** — React + TypeScript + Vite. See [frontend/README.md](frontend/README.md).
- **Auth** — JWT-based, demo user in development.

Job state is currently held in-process (no database, no Redis). That has implications for deployment — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Quick Start

Prerequisites: Python 3.9+, Node.js 18+.

```bash
# one-shot (starts backend + frontend)
./start.sh
```

Or manually:

```bash
# backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

Ask a maintainer for demo credentials.

## Further Reading

- [backend/README.md](backend/README.md) — backend setup, API endpoints, TRAPI format
- [frontend/README.md](frontend/README.md) — frontend features, project structure, build
- [DEPLOYMENT.md](DEPLOYMENT.md) — Docker images, CI, production caveats

## License

Part of the NIH Biomedical Data Translator Consortium.

## Acknowledgments

- NIH Biomedical Data Translator Consortium
- Renaissance Computing Institute (RENCI)
- TRAPI standard contributors
