# MaintainIQ Platform

### AI-powered predictive maintenance intelligence for modern industrial operations.

<p align="left">
  <img src="https://img.shields.io/github/actions/workflow/status/Velshaun/predictive-maintenance-dashboard/deploy.yml?branch=main&label=CI%2FCD&logo=github-actions&logoColor=white&style=flat-square" alt="Build Status" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.100-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/scikit--learn-1.3-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" alt="scikit-learn" />
  <img src="https://img.shields.io/badge/Claude-AI-8B5CF6?style=flat-square&logo=anthropic&logoColor=white" alt="Claude AI" />
  <img src="https://img.shields.io/badge/AWS-EKS-FF9900?style=flat-square&logo=amazon-aws&logoColor=white" alt="AWS EKS" />
  <img src="https://img.shields.io/badge/Terraform-IaC-7B42BC?style=flat-square&logo=terraform&logoColor=white" alt="Terraform" />
</p>

---

## Overview

MaintainIQ Platform is a full-stack predictive maintenance intelligence system designed to give industrial operations teams a real-time, data-driven view of their equipment health — before failures happen. The platform ingests sensor telemetry from registered machines, runs machine learning models to forecast days until next required service, scores anomaly risk for each asset, and surfaces those predictions through a polished, interactive dashboard. Maintenance teams can drill into individual machines, review historical logs, mark equipment as serviced, and receive natural language AI insights powered by the Anthropic Claude API. The entire platform is containerised, deployed on AWS Elastic Kubernetes Service, and provisioned through Terraform — making it portable, scalable, and production-ready from day one.

---

## Features

- **Real-Time Machine Health Monitoring** — Live status tracking across all registered assets with colour-coded health indicators (Operational / Service Soon / Critical), live countdown timers to next required service, and row-level pulse animations for at-risk machines.

- **ML-Based Failure Predictions** — A scikit-learn pipeline combining a Random Forest regressor (days until service) and an Isolation Forest anomaly detector runs per-machine on demand. Predictions are cached in localStorage with live countdowns recalculated every 60 seconds from a stored `service_due_date`.

- **Claude AI Natural Language Insights** — The Anthropic Claude API synthesises each machine's sensor readings, maintenance history, and prediction output into concise, human-readable maintenance recommendations directly inside the machine detail view.

- **Interactive Charts & KPI Dashboards** — A Recharts-powered analytics layer delivers sensor temperature trend lines for the three most at-risk machines, a fleet health donut chart with a custom cursor-tracked tooltip, a cumulative maintenance cost bar chart, and a full-width predictions chart sorted and filtered by any column.

- **Predictions Table with Sortable Columns** — Every column in the Predictions and Machines tables supports ascending/descending sort. A dedicated Service column with a styled wrench button triggers a confirmation modal to mark equipment as serviced, resetting the 90-day service window and logging a maintenance entry.

- **Settings & Configuration** — A dedicated Settings page allows operators to manage API integrations, notification thresholds, and display preferences without touching environment variables.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MaintainIQ Platform                          │
└─────────────────────────────────────────────────────────────────────┘

  Browser
  ┌──────────────────────┐
  │   React 18 (CRA)     │  Recharts · React Router · inline styles
  │   Nginx (container)  │
  └──────────┬───────────┘
             │  REST / JSON (axios)
             ▼
  ┌──────────────────────┐      ┌───────────────────┐
  │  FastAPI (Python)    │─────▶│  Anthropic Claude  │
  │  SQLAlchemy ORM      │      │  API (AI insights) │
  │  Pydantic schemas    │      └───────────────────┘
  └──────────┬───────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
  ┌──────────┐   ┌────────────────────────┐
  │PostgreSQL│   │  scikit-learn ML layer  │
  │ (AWS RDS)│   │  ├─ Random Forest       │
  └──────────┘   │  │  (days until service)│
                 │  └─ Isolation Forest    │
                 │     (anomaly scoring)   │
                 └────────────────────────┘

  ─────────────────── Infrastructure ─────────────────────

  ┌─────────────────────────────────────────────────────┐
  │                    AWS EKS Cluster                   │
  │  ┌─────────────────┐   ┌───────────────────────┐   │
  │  │  frontend pod   │   │    backend pod(s)      │   │
  │  │  (Nginx/React)  │   │  (FastAPI/Uvicorn)     │   │
  │  └─────────────────┘   └───────────────────────┘   │
  │          └──────────────────┘                        │
  │                  AWS VPC · ECR · RDS                  │
  └─────────────────────────────────────────────────────┘
              ▲                        ▲
              │   GitHub Actions CI/CD │
              │   Terraform IaC        │
              └────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Recharts, inline CSS-in-JS |
| **Backend** | FastAPI, Uvicorn, SQLAlchemy (async), Pydantic v2, Alembic |
| **Database** | PostgreSQL 15 (AWS RDS in production, Docker in development) |
| **Machine Learning** | scikit-learn 1.3 — Random Forest Regressor, Isolation Forest |
| **AI / NLP** | Anthropic Claude API (claude-3-haiku) |
| **Containerisation** | Docker, Docker Compose (multi-service local dev) |
| **Infrastructure** | AWS EKS, AWS RDS, AWS ECR, AWS VPC, Terraform |
| **CI/CD** | GitHub Actions (test → build → push ECR → deploy EKS) |
| **Testing** | Pytest (backend), Jest + React Testing Library (frontend) |

---

## CI/CD Pipeline

MaintainIQ uses a two-branch GitHub Actions strategy defined in `.github/workflows/deploy.yml`:

**On push to `develop`:**
1. Spins up a PostgreSQL service container
2. Installs Python dependencies and runs the full Pytest suite (`backend/tests/`)
3. Installs Node dependencies and runs the React Jest test suite
4. Reports pass/fail status — no deployment occurs

**On merge / push to `main`:**
1. Runs all tests (same as above)
2. Builds the backend Docker image and tags it with the Git SHA
3. Builds the frontend Docker image (Nginx + production React build)
4. Authenticates with AWS via OIDC and pushes both images to Amazon ECR
5. Updates the Kubernetes deployment manifests with the new image tags
6. Applies the manifests to the EKS cluster via `kubectl` — rolling deploy with zero downtime

Infrastructure is provisioned separately via Terraform (`infrastructure/terraform/`) which manages the EKS cluster, node groups, RDS instance, ECR repositories, VPC, subnets, and IAM roles.

---

## Local Development Setup

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- Docker & Docker Compose
- PostgreSQL (or use Docker Compose)

### 1. Clone the repository

```bash
git clone https://github.com/Velshaun/predictive-maintenance-dashboard.git
cd predictive-maintenance-dashboard
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Apply DB migrations (ensure Postgres is running)
alembic upgrade head

# Seed sample data
python seed_data.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

App available at: `http://localhost:3000`

### 4. Run tests

```bash
# Backend
cd backend
pytest --tb=short -v

# Frontend
cd frontend
npm test -- --watchAll=false
```

---

## Docker Compose

The easiest way to run the full stack locally in one command:

```bash
docker compose up --build
```

This starts three services:

| Service | Port | Description |
|---|---|---|
| `db` | 5432 | PostgreSQL 15 |
| `backend` | 8000 | FastAPI + Uvicorn |
| `frontend` | 3000 | React dev server |

To seed the database after the containers are up:

```bash
docker compose exec backend python seed_data.py
```

---

## Environment Variables

Create a `.env` file at the project root (or set these in your deployment environment):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string — `postgresql+asyncpg://user:pass@host:5432/dbname` |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic Claude API key for AI insights |
| `SECRET_KEY` | ✅ | Application secret key (JWT / session signing) |
| `CORS_ORIGINS` | ✅ | Comma-separated list of allowed CORS origins |
| `ENVIRONMENT` | ⬜ | `development` or `production` (default: `development`) |
| `AWS_REGION` | ⬜ | AWS region for ECR / EKS (production only) |
| `ECR_REGISTRY` | ⬜ | ECR registry URL (production only) |

---

## Deployment

### Railway (Backend — Recommended for quick deployment)

The backend is pre-configured for [Railway](https://railway.app) with `backend/railway.json`, `backend/Procfile`, and a `$PORT`-aware Dockerfile. Railway auto-detects the Dockerfile and injects all runtime environment variables.

#### Steps

1. **Create a new Railway project** at [railway.app](https://railway.app) and connect your GitHub repository.

2. **Set the root directory** to `backend` in the Railway service settings so it builds from `backend/Dockerfile`.

3. **Add a PostgreSQL plugin** — Railway provisions a managed Postgres instance and automatically injects `DATABASE_URL` into your service.

4. **Add environment variables** in the Railway service → *Variables* tab (use `backend/.env.example` as a reference):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Auto-injected by Railway PostgreSQL plugin |
   | `ANTHROPIC_API_KEY` | Your Anthropic Claude API key |
   | `SECRET_KEY` | Run `python -c "import secrets; print(secrets.token_hex(32))"` |
   | `ENVIRONMENT` | `production` |
   | `ALLOWED_ORIGINS` | Your Vercel deployment URL, e.g. `https://your-app.vercel.app` |

5. **Deploy** — Railway deploys automatically on every push to `main`. The start command from `railway.json` is used:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

6. **Update the Vercel proxy** — once Railway assigns your service URL (e.g. `https://your-app.up.railway.app`), update `BACKEND_HOST` in `api/[...path].js` to that URL and redeploy Vercel. The frontend will route all `/api/*` calls through the Vercel serverless proxy to Railway with no CORS issues.

   Alternatively, for direct frontend → Railway calls, set `REACT_APP_API_URL` in `.env.production` to your Railway URL (see Option B comments in that file) and set `ALLOWED_ORIGINS` on the Railway service to your Vercel URL.

---

### Kubernetes Deployment (AWS EKS)

Kubernetes manifests live in `infrastructure/kubernetes/`:

```
infrastructure/kubernetes/
├── backend-deployment.yml      # FastAPI deployment + service
├── frontend-deployment.yml     # Nginx/React deployment + service
└── ingress.yml                 # AWS ALB ingress controller rules
```

To apply manually (assumes `kubectl` is configured against your EKS cluster):

```bash
# Apply all manifests
kubectl apply -f infrastructure/kubernetes/

# Check rollout status
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend

# View running pods
kubectl get pods -n maintainiq
```

Terraform provisions the cluster and node groups. To initialise and apply infrastructure:

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

---

## Why I Built MaintainIQ

Over the past few years I've developed a deep interest in AI — not as a buzzword, but as a genuine engineering tool with meaningful applications in the real world. Predictive maintenance represents exactly the kind of problem I find compelling: it's data-rich, consequential, and sits at the intersection of systems engineering, machine learning, and operational decision-making. An unplanned equipment failure in an industrial setting doesn't just cost money — it can halt production, create safety risks, and erode the confidence of the teams that depend on those systems running reliably.

MaintainIQ was conceived, designed, and driven entirely by me, from the initial architecture decisions through to the CI/CD pipeline and Kubernetes deployment. Throughout the build I used AI — specifically Claude and similar tools — as a collaborative accelerant: to scaffold boilerplate quickly, to pressure-test architectural ideas, and to refine implementation details at pace. But every line of code was reviewed and understood by me. I made the calls on data modelling, ML pipeline design, API contracts, frontend state management, and infrastructure topology. The goal was always to build something I could stand behind end-to-end — not a demo stitched together from prompts, but a production-grade system I can reason about, extend, and operate.

I built MaintainIQ to demonstrate that AI-assisted engineering, done with discipline and intentionality, can produce systems that are genuinely well-architected — and to continue pushing my own capabilities at the frontier of what's possible when human expertise and AI tooling work together.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Built with intent by <strong>Vel Byers</strong> · MaintainIQ Platform © 2026</p>
