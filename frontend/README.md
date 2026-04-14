# EDGAR Frontend

React + TypeScript frontend for EDGAR (Enrichment-Driven GrAph Reasoner), a biomedical knowledge graph analysis platform.

## Features

- **Authentication** — login/logout flow
- **Query Builder** — interactive TRAPI query construction with preset use cases:
  - Drug Repurposing
  - Gene Discovery
  - Function Prediction
  - Pathway Analysis
  - Target Identification
- **Job Tracking** — 3-second polling with progress bar and per-stage pipeline visualization
- **Results Visualization**
  - Overview statistics
  - Interactive bar charts for top results
  - Knowledge graph exploration
  - Analysis logs
- **Job History** — browse previous analyses and reopen completed jobs in the dashboard
- **Responsive Design**

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts (charts)
- Cytoscape.js (knowledge graph)
- Axios
- Lucide React (icons)

## Getting Started

Prerequisites: Node.js 18+ and a running EDGAR backend at `http://localhost:8000`.

```bash
cd frontend
npm install
npm run dev
```

Available at http://localhost:5173.

### Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

## Usage

### Login

Ask a maintainer for demo credentials.

### Submit a Query

1. Select a use case (e.g., Drug Repurposing), **or** enter an entity ID in CURIE format (e.g., `MONDO:0005148` for Type 2 Diabetes).
2. Adjust advanced parameters if needed:
   - P-value threshold (default: `1e-5`)
   - Maximum results (default: `100`)
3. Click **Run Enrichment Analysis**.

### Monitor Progress

- Status: Queued → Running → Completed / Failed
- Progress bar updates every 3 seconds
- Pipeline stage icons show Lookup → Enrichment → Inference → Finalization → Response

### View Results

- **Overview** — summary statistics and query graph
- **Results** — interactive chart and ranked result list
- **Knowledge Graph** — node/edge exploration
- **Logs** — execution details per stage

### Job History

Open **Job History** in the nav, then click **View** on a completed job to load it in the dashboard.

## API Configuration

The API base URL is derived at runtime in [src/utils/api.ts](src/utils/api.ts):

- `localhost` → `http://localhost:8000/api/v1`
- any other host → `<origin>/api/v1`

The built bundle is therefore environment-agnostic and works behind any reverse proxy that exposes `/api/v1`.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Home.tsx           # top-level layout + navigation
│   │   ├── Dashboard.tsx      # query builder + status + results
│   │   ├── Login.tsx
│   │   ├── QueryBuilder.tsx
│   │   ├── JobStatus.tsx      # poll-driven job progress
│   │   ├── ResultsViewer.tsx
│   │   ├── JobHistory.tsx
│   │   └── ...
│   ├── contexts/              # auth state
│   ├── utils/api.ts           # API client
│   ├── types/                 # TypeScript definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Implementation Notes

- **Polling, not WebSockets.** `JobStatus.tsx` polls `/status/{job_id}` every 3s. A `createJobWebSocket` helper exists in `utils/api.ts` but is not currently wired up.
- **Type Safety.** TRAPI types live in `src/types/`.
- **Error Handling.** API errors surface in the UI; auth errors route to login.

## Customization

### Styling

Tailwind utility classes throughout. Extend theme in `tailwind.config.js`.

### Use Cases

Add or modify in `QueryBuilder.tsx`:

```typescript
const USE_CASES: UseCase[] = [
  {
    id: 'custom_case',
    name: 'Custom Analysis',
    description: 'Description',
    subjectCategory: 'biolink:SubjectCategory',
    objectCategory: 'biolink:TargetCategory',
    predicates: ['biolink:predicate'],
  },
  // ...
];
```
