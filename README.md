# EDGAR — Enrichment-Driven GrAph Reasoner

## Overview

EDGAR uses statistical enrichment analysis over biomedical knowledge graphs to predict missing links. Given a query entity and relationship type, the pipeline operates in three stages:

![EDGAR Workflow](frontend/images/workflowEDGAR.png)

1. **Lookup Stage** — Retrieve all known entities connected to the input (e.g., all chemicals that treat a disease).
2. **Enrichment Analysis** — Identify features (genes, phenotypes, pathways, etc.) that are statistically over-represented among the lookup set using hypergeometric/Poisson tests. Each enrichment rule is scored by p-value.
3. **Enrichment-based Results** — Use the significant enrichment rules to infer novel entities that share those enriched features but were not in the original lookup set.

## EDGAR Applications

EDGAR supports a range of biomedical link prediction tasks, including:

- **Drug Repurposing** — drugs that may treat a disease
- **Gene Discovery** — genes associated with conditions
- **Function Prediction** — biological processes for genes
- **Pathway Analysis** — pathways involving specific genes
- **Target Identification** — gene targets for chemical compounds


## EDGAR Paper

> O. Olasunkanmi, E. Morris, Y. Kebede, H. Lee, S. C. Ahalt, A. Tropsha, and C. Bizon, "Explainable Enrichment-Driven GrAph Reasoner (EDGAR) for Large Knowledge Graphs with Applications in Drug Repurposing," *2024 IEEE International Conference on Big Data (BigData)*, Washington, DC, USA, 2024, pp. 777-782.
>
> DOI: [10.1109/BigData62323.2024.10825589](https://ieeexplore.ieee.org/document/10825589)

<details>
<summary>BibTeX</summary>

```bibtex
@inproceedings{olasunkanmi2024explainable,
  title={Explainable enrichment-driven graph reasoner (edgar) for large knowledge graphs with applications in drug repurposing},
  author={Olasunkanmi, Olawumi and Morris, Evan and Kebede, Yaphet and Lee, Harlin and Ahalt, Stanley C and Tropsha, Alexander and Bizon, Chris},
  booktitle={2024 IEEE International Conference on Big Data (BigData)},
  pages={777--782},
  year={2024},
  organization={IEEE}
}
```

</details>

## EDGAR UI

A web application for biomedical link prediction using enrichment analysis over knowledge graphs, built on the TRAPI (Translator Reasoner API) standard.

![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square) ![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=flat-square)

**Live instance:** [edgar.apps.renci.org](https://edgar.apps.renci.org)


## Architecture

EDGAR submits TRAPI queries to [AnswerCoalesce](https://answercoalesce.renci.org/docs) (AC) via its `/asyncquery` endpoint with a callback URL, and surfaces the results through a React UI.

- **Backend** — FastAPI (async) that submits queries to AC's `/asyncquery` with a callback URL. AC processes in the background and POSTs the full TRAPI result back when done. Falls back to polling if the callback approach is unavailable. See [backend/README.md](backend/README.md).
- **Frontend** — React + TypeScript + Vite with real-time job status updates via WebSocket. See [frontend/README.md](frontend/README.md).
- **Auth** — JWT-based, demo user in development.

Job state is currently held in-process (no database). That has implications for deployment — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Running Locally

Prerequisites: Python 3.9+, Node.js 18+.

**1. Install once:**

```bash
cd backend  && pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..
```

**2. Start both services:**

```bash
./start.sh
```

That's it — `start.sh` boots the backend on :8000 and the frontend on :5173 in the same terminal and cleans up on Ctrl+C.

Prefer two terminals? Run them manually:

```bash
# terminal 1 — backend
cd backend && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173 and log in with `demo` / `demo` (dev-only credentials, defined in the backend).

## Redeploying

After merging to `main`, the release workflow pushes new container images. To roll the pods in the cluster:

```bash
kubectl rollout restart deployment edgar-ui-backend  -n <your-namespace>
kubectl rollout restart deployment edgar-ui-frontend -n <your-namespace>
```

First-time install (helm chart, namespace, ingress) is covered in [DEPLOYMENT.md](DEPLOYMENT.md#cluster-deployment).

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
