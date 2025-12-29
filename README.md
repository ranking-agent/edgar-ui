# EDGAR - Enrichment-Driven GrAph Reasoner

A web application for biomedical knowledge graph enrichment analysis, enrichment-driven Graph Reasoner -EDGAR (link prediction) through the TRAPI (Translator Reasoner API) standard.

![EDGAR Architecture](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square) ![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=flat-square) ![Database](https://img.shields.io/badge/Database-Neo4j-008CC1?style=flat-square) ![Cache](https://img.shields.io/badge/Cache-Redis-DC382D?style=flat-square)

## Overview

EDGAR is a enrichment-driven link prediction platform for biomedical knowledge graphs, supporting multiple use cases:

- **Drug Repurposing**: Discover drugs that may treat specific diseases
- **Gene Discovery**: Identify genes associated with conditions
- **Function Prediction**: Predict biological processes for genes
- **Pathway Analysis**: Find pathways involving specific genes
- **Target Identification**: Identify gene targets for chemical compounds

## Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async/await
- **API**: RESTful endpoints + WebSocket for real-time updates
- **Database**: Neo4j for graph storage
- **Cache**: Redis for job queuing and caching
- **Authentication**: JWT-based (development mode: demo/demo)
- **Documentation**: Auto-generated OpenAPI/Swagger

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: React Context API

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
<!-- - Neo4j 4.4+ (running on localhost:7687)
- Redis 6+ (running on localhost:6379) -->

### Installation

1. **Clone and extract the project**

2. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt --break-system-packages
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
```

### Configuration (Optional)

#### Backend Configuration 
Edit `backend/app/core/config.py` or set environment variables:

```python
# Neo4j
# NEO4J_URI = "bolt://localhost:7687"
# NEO4J_USER = "neo4j"
# NEO4J_PASSWORD = "passwordhere"

# # Redis
# REDIS_URL = "redis://localhost:6379"

# CORS
CORS_ORIGINS = ["http://localhost:5173"]
```

#### Frontend Configuration
The API URL is set in `frontend/src/utils/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8000/api/v1';
```

### Running the Application

#### Option 1: Use the startup script (recommended)
```bash
./start.sh
```

#### Option 2: Start services manually

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
<!-- - **Login**: username: `demo`, password: `demo` -->

## Usage Guide

### 1. Login
Ask for the demo credentials to access the application.

### 2. Pick a task eg EDGAR/ Enrichment Analysis or others

### 3. Create a Query
- Select a use case (e.g., Drug Repurposing) OR
  - Enter an entity ID in CURIE format eg:
    - Diseases: `MONDO:0005148` (Type 2 Diabetes)
    - Drugs: `CHEMBL.COMPOUND:CHEMBL25` (Aspirin)
    - Genes: `NCBIGene:1636` (ACE gene)
- Adjust parameters:
  - P-value threshold (default: 1e-5)
  - Maximum results (default: 100)

### 3. Monitor Analysis
- Status transitions: Queued → Running → Completed
- Progress bar shows completion percentage

### 4. Explore Results
- **Overview**: Summary statistics and query graph
- **Top Results**: Interactive chart with ranked predictions
- **Knowledge Graph**: Explore nodes and edges
- **Logs**: View analysis execution details
<!-- 
### 5. Browse History
- Access previous analyses
- Reload completed jobs
- Track analysis patterns -->

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

### Enrichment Analysis
- `POST /api/v1/enrichment/analyze` - Submit TRAPI query
- `GET /api/v1/enrichment/status/{job_id}` - Get job status
- `GET /api/v1/enrichment/results/{job_id}` - Get analysis results
- `GET /api/v1/enrichment/history` - Get user's job history

<!-- ### WebSocket
- `WS /ws/job/{job_id}` - Real-time job updates -->

See full API documentation at http://localhost:8000/api/docs

## TRAPI Query Format

EDGAR accepts queries in the Translator Reasoner API (TRAPI) format:

```json
{
  "message": {
    "query_graph": {
      "nodes": {
        "n0": {
          "ids": ["MONDO:0005148"],
          "categories": ["biolink:Disease"]
        },
        "n1": {
          "categories": ["biolink:Drug"]
        }
      },
      "edges": {
        "e0": {
          "subject": "n0",
          "object": "n1",
          "predicates": ["biolink:treats"]
        }
      }
    }
  },
  "parameters": {
    "pvalue_threshold": 1e-5,
    "result_length": 100
  }
}
```

## Development

### Backend Development

**Project Structure:**
```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── enrichment.py
│   │       │   └── query.py
│   │       └── router.py
│   ├── core/
│   │   └── config.py
│   ├── models/
│   │   ├── enrichment.py
│   │   └── user.py
│   ├── services/
│   │   └── enrichment_service.py
│   ├── db/
│   │   ├── neo4j.py
│   │   └── redis.py
│   └── main.py
└── requirements.txt
```

**Run tests:**
```bash
pytest
```

### Frontend Development

**Project Structure:**
```
frontend/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # Context providers
│   ├── utils/          # Utilities and API client
│   ├── types/          # TypeScript definitions
│   └── App.tsx         # Root component
├── public/             # Static assets
└── package.json
```

**Build:**
```bash
npm run build
```

**Type checking:**
```bash
npm run type-check
```

## Deployment

### Backend Deployment

1. Set production environment variables
2. Use a production WSGI server (e.g., Gunicorn)
3. Enable HTTPS
4. Configure proper CORS origins
5. Set up database backups

```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend Deployment

1. Build for production:
```bash
npm run build
```

2. Serve the `dist/` directory with a web server (nginx, Apache, etc.)

3. Configure API URL for production in `src/utils/api.ts`

<!-- ## Troubleshooting

### Backend Issues

**Database connection failed:**
- Check Neo4j is running: `systemctl status neo4j`
- Verify credentials in config
- Test connection: `cypher-shell -u neo4j -p password`

**Redis connection failed:**
- Check Redis is running: `systemctl status redis`
- Test connection: `redis-cli ping`

### Frontend Issues

**CORS errors:**
- Update `CORS_ORIGINS` in backend config
- Restart backend after changes

**WebSocket connection failed:**
- Check backend WebSocket endpoint
- Verify no proxy blocking WebSocket
- App falls back to polling automatically

### General Issues

**Port already in use:**
- Backend: Change port in `main.py` and update frontend API URL
- Frontend: Set `PORT` environment variable or edit `vite.config.ts` -->

## Contributing?

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Write tests
5. Submit a pull request

## License

This project is part of the Biomedical Data Translator Consortium.

## Support

- Documentation: Check README files in `backend/` and `frontend/`
- API Docs: http://localhost:8000/api/docs
- Issues: Report bugs and request features via GitHub issues

## Acknowledgments

- NIH Biomedical Data Translator Consortium
- Renaissance Computing Institute (RENCI)
- TRAPI Standard Contributors
