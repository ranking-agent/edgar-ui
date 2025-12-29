# EDGAR Frontend

Modern React/TypeScript frontend for the EDGAR (Enrichment-Driven GrAph Reasoner) biomedical knowledge graph analysis platform.

## Features

- **Authentication**: Secure login/logout system
- **Query Builder**: Interactive interface for building TRAPI queries with multiple use cases:
  - Drug Repurposing
  - Gene Discovery
  - Function Prediction
  - Pathway Analysis
  - Target Identification
- **Real-time Job Tracking**: WebSocket-based status updates with progress indicators
- **Results Visualization**: 
  - Overview statistics
  - Interactive bar charts showing top results
  - Knowledge graph exploration
  - Analysis logs
<!-- - **Job History**: Browse and reload previous analyses -->
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Axios** for API communication
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- EDGAR backend running on `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Login
<!-- 
Use the demo credentials:
- Username: `demo`
- Password: `demo` -->

### Submit a Query

1. Select a use case (e.g., Drug Repurposing) OR Enter an entity ID in CURIE format (e.g., `MONDO:0005148` for Type 2 Diabetes)
3. Adjust advanced parameters if needed:
   - P-value threshold (default: 1e-5)
   - Maximum results (default: 100)
4. Click "Run Enrichment Analysis"

### Monitor Progress

- Status indicators: Queued → Running → Completed/Failed
- Progress bar during analysis

### View Results

Once complete, explore:
- **Overview**: Summary statistics and query graph
- **Results**: Interactive chart and detailed list of ranked results
- **Knowledge Graph**: Explore nodes and edges
- **Logs**: Analysis execution logs

### Job History

- Click "Job History" in the header
- View all previous analyses
- Click "View Results" on completed jobs to reload them

## API Configuration

The API base URL is configured in `src/utils/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8000/api/v1';
```

Update this if backend is running on a different address.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx      # Main dashboard layout
│   │   ├── Login.tsx          # Login page
│   │   ├── QueryBuilder.tsx   # Query creation interface
│   │   ├── JobStatus.tsx      # Real-time job monitoring
│   │   ├── ResultsViewer.tsx  # Results visualization
│   │   └── JobHistory.tsx     # Job history list
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state management
│   ├── utils/
│   │   └── api.ts             # API client and utilities
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── App.tsx                # Root component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── index.html                 # HTML template
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite config
└── tailwind.config.js         # Tailwind CSS config
```

## Development Notes

### WebSocket Support

The application uses WebSockets for real-time job updates. If WebSocket connection fails, it automatically falls back to polling every 3 seconds.

### Error Handling

- API errors are displayed in the UI with user-friendly messages
- Network failures trigger automatic retries where appropriate
- Authentication errors redirect to login page

### Type Safety

Full TypeScript coverage ensures type safety across the application. All TRAPI types are defined in `src/types/index.ts`.

## Customization

### Styling

Tailwind CSS utility classes are used throughout. Modify `tailwind.config.js` to customize:
- Colors
- Spacing
- Typography
- Breakpoints

### Use Cases

Add or modify use cases in `QueryBuilder.tsx`:

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

