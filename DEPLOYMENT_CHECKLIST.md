# MaintainIQ — Production Deployment Checklist

> Use this checklist before every production release.  
> Check each item off (`[x]`) and note the date/owner when verified.

---

## 1 · Frontend Environment Variables

| Item | Status | Notes |
|------|--------|-------|
| `frontend/.env.production` exists with `REACT_APP_API_URL` | ☐ | Must point to AWS ALB DNS or API Gateway URL |
| `REACT_APP_API_URL` secret is set in GitHub Actions | ☐ | Used as `--build-arg` in the Docker build step |
| Production React build (`npm run build`) completes without errors | ☐ | Run locally: `cd frontend && npm run build` |
| `api.js` uses `process.env.REACT_APP_API_URL \|\| ''` as base URL | ☐ | Verified — falls back to same-origin proxy in dev |
| All API calls go through the shared `api` axios instance | ☐ | No hardcoded `http://localhost:8000` in source |

**How to verify:** Run `grep -r "localhost:8000" frontend/src/` — should return no results.

---

## 2 · CORS Configuration (FastAPI Backend)

| Item | Status | Notes |
|------|--------|-------|
| `ALLOWED_ORIGINS` env var is read in `backend/app/main.py` | ☐ | ✅ Implemented — splits on `,` |
| `allowed-origins` key is present in the `app-secrets` Kubernetes secret | ☐ | Set via `kubectl create secret` in CI/CD |
| Vercel frontend domain is in the ALLOWED_ORIGINS list | ☐ | e.g. `https://maintainiq.vercel.app` |
| CORS pre-flight requests return HTTP 200 from the backend | ☐ | Test with `curl -X OPTIONS https://api.maintainiq.com/api/machines/ -H "Origin: https://maintainiq.vercel.app" -I` |

**GitHub Actions secret to configure:**
```
ALLOWED_ORIGINS=https://maintainiq.vercel.app,https://www.maintainiq.vercel.app
```

---

## 3 · Database Migrations

| Item | Status | Notes |
|------|--------|-------|
| `machines` table has `is_deleted BOOLEAN NOT NULL DEFAULT false` | ☐ | ✅ In SQLAlchemy model |
| `machines` table has `deleted_at TIMESTAMP` (nullable) | ☐ | ✅ In SQLAlchemy model |
| Startup migration in `main.py` safely adds columns to existing DBs | ☐ | ✅ `ALTER TABLE … ADD COLUMN` wrapped in try/except |
| Soft-delete API endpoints work end-to-end | ☐ | Covered by `test_machines.py` |
| Seed data loads successfully: 10 machines, 600 readings, 30+ logs | ☐ | `cd backend && python seed_data.py` |

**How to verify schema:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'machines'
  AND column_name IN ('is_deleted', 'deleted_at');
```

---

## 4 · ML Model Training & Predictions

| Item | Status | Notes |
|------|--------|-------|
| ML model auto-trains on pod startup if ≥ 20 sensor readings exist | ☐ | ✅ `auto_train_from_db()` called in `startup()` |
| `POST /api/predictions/train` returns `{"status":"trained","samples":N}` | ☐ | Requires ≥ 20 readings |
| `POST /api/predictions/run/{id}` returns `days_until_service` in **[7, 90]** | ☐ | ✅ Clamped in `predictor.py` |
| All 10 seeded machines return successful predictions | ☐ | Run via Predictions page UI |
| Fallback values used when no sensor reading exists (no crash) | ☐ | ✅ Defaults: temp=70, vib=3, pres=85, runtime=200 |
| `anomaly_score` is returned alongside every prediction | ☐ | Used for anomaly pill in UI |
| Model `.pkl` files persist in the pod filesystem between requests | ☐ | Stored at `backend/app/ml/model.pkl` |

**How to verify all 10 machines via curl:**
```bash
for i in $(seq 1 10); do
  curl -s -X POST https://api.maintainiq.com/api/predictions/run/$i | python3 -m json.tool
done
```

---

## 5 · localStorage Persistence

| Item | Status | Notes |
|------|--------|-------|
| Prediction results saved to `pm_prediction_results` key | ☐ | ✅ JSON: `{ predictions, timestamp }` |
| Reloading the Predictions page restores saved predictions | ☐ | ✅ Hydrated on mount in `PredictionsPage.js` |
| Deleted machine metadata saved to `deleted_machines` key | ☐ | ✅ Includes last prediction snapshot |
| Restoring a machine also restores its prediction data | ☐ | ✅ Re-written to `pm_prediction_results` on restore |
| Permanent delete removes machine from both localStorage keys | ☐ | ✅ `delete predData.predictions[id]` on perm-delete |
| `Mark as Serviced` persists new `service_due_date` (+90 days) | ☐ | ✅ Saved in both `MachinesPage` and `PredictionsPage` |

---

## 6 · Live Countdown Timer & Mark as Serviced

| Item | Status | Notes |
|------|--------|-------|
| Countdown ticks from `service_due_date` (real date math, not static) | ☐ | ✅ `calcCountdown(service_due_date, now)` |
| Timer refreshes every 60 seconds via `setInterval` | ☐ | ✅ Both `MachinesPage` and `PredictionsPage` |
| Overdue state shown (0 days + red "Overdue" badge) when past due date | ☐ | ✅ `diffMs < 0 → { days: 0, isOverdue: true }` |
| `Mark as Serviced` modal requires explicit confirmation | ☐ | ✅ `ServiceModal` / `serviceModal` state |
| Confirming service resets prediction to 90 days from *now* | ☐ | ✅ `Date.now() + 90 * 86400000` |
| Confirming service logs a maintenance entry via `POST /api/machines/logs` | ☐ | ✅ `addLog({ description: 'Serviced via MaintainIQ…' })` |

---

## 7 · UI / UX Quality

| Item | Status | Notes |
|------|--------|-------|
| All charts use **Recharts** (`recharts` npm package) | ☐ | ✅ LineChart, BarChart, PieChart in Dashboard & Predictions |
| Chart data matches the table data (same source of truth) | ☐ | ✅ Both built from the same `predRows` / `machines` arrays |
| Delete confirmation modal with Cancel / Confirm buttons | ☐ | ✅ `MachinesPage.js` `deleteModal` state |
| Service confirmation modal with Cancel / "Yes, mark as serviced" | ☐ | ✅ Both `MachinesPage` and `PredictionsPage` |
| Skeleton loaders shown during data fetch | ☐ | ✅ `<Sk />` and `<StatCardSkeleton />` components |
| Status badges use consistent green / yellow / red semantics | ☐ | ✅ `StatusBadge` component |
| Responsive grid layout (minmax 300px) in Dashboard machine grid | ☐ | ✅ CSS Grid `auto-fill` |
| Empty states shown when no machines / no predictions | ☐ | ✅ Custom SVG placeholders |
| Animations: `fade-slide-up`, `page-enter`, `spin` | ☐ | ✅ Defined in `index.css` |
| Overall aesthetic matches modern SaaS (Linear / Vercel style) | ☐ | Clean white cards, slate palette, 14px radius |

---

## 8 · Test Suites

### Backend (pytest)
```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v --tb=short
```

| Test file | Tests | Status |
|-----------|-------|--------|
| `test_machines.py` | health check, CRUD, soft-delete, restore, permanent delete, logs | ☐ |
| `test_predictions.py` | sensor readings, status thresholds, ML predict, train | ☐ |
| `test_logs.py` | list, create, get by ID, delete | ☐ |

**Expected result:** All tests pass (0 failures).

### Frontend (Jest)
```bash
cd frontend
npm ci
CI=true npm test -- --watchAll=false --forceExit
```

| Test file | Tests | Status |
|-----------|-------|--------|
| `api.test.js` | axios instance, all 16 helper functions, HTTP paths, prediction shapes | ☐ |
| `StatusBadge.test.js` | label, size prop, colours | ☐ |
| `SettingsPage.test.js` | render, defaults, persistence, save, clamping, toggles, reset | ☐ |

**Expected result:** All test suites pass (0 failures).

---

## 9 · GitHub Actions CI/CD Pipeline

| Item | Status | Notes |
|------|--------|-------|
| `test` job runs on every push to `main` and PR to `develop` | ☐ | ✅ In `deploy.yml` |
| Backend tests (`pytest`) pass in CI | ☐ | |
| Frontend tests (`jest`) pass in CI | ☐ | |
| Frontend production build (`npm run build`) succeeds in CI | ☐ | Uses `REACT_APP_API_URL` secret |
| `deploy` job only runs on `main` branch | ☐ | ✅ `if: github.ref == 'refs/heads/main'` |
| Backend Docker image built and pushed to ECR with SHA tag | ☐ | `$ECR_BACKEND:$GITHUB_SHA` |
| Frontend Docker image built with `--build-arg REACT_APP_API_URL` | ☐ | ✅ Added in updated workflow |
| `app-secrets` Kubernetes secret created/updated (includes `allowed-origins`) | ☐ | ✅ Added in updated workflow |
| Both `backend-deployment.yml` and `frontend-deployment.yml` applied | ☐ | ✅ `frontend-deployment.yml` created |
| `kubectl rollout status` confirms pods are healthy | ☐ | 10-minute timeout |

**Required GitHub Actions secrets:**

| Secret | Example value |
|--------|--------------|
| `AWS_REGION` | `us-east-2` |
| `AWS_ACCOUNT_ID` | `123456789012` |
| `AWS_ACCESS_KEY_ID` | `AKIA…` |
| `AWS_SECRET_ACCESS_KEY` | `…` |
| `ECR_BACKEND_REPO` | `maintenance-dashboard-backend` |
| `ECR_FRONTEND_REPO` | `maintenance-dashboard-frontend` |
| `EKS_CLUSTER_NAME` | `maintainiq-cluster` |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` |
| `ANTHROPIC_API_KEY` | `sk-ant-…` |
| `ALLOWED_ORIGINS` | `https://maintainiq.vercel.app,https://www.maintainiq.vercel.app` |
| `REACT_APP_API_URL` | `https://api.maintainiq.com` |

---

## 10 · Final Go-Live Verification

| Item | Status | Notes |
|------|--------|-------|
| DNS is pointed at the Vercel deployment (frontend) | ☐ | |
| DNS is pointed at the AWS ALB (backend API) | ☐ | |
| SSL/TLS certificates are valid (HTTPS enforced) | ☐ | Let's Encrypt / ACM |
| Health endpoint returns `{"status":"ok"}` from production | ☐ | `curl https://api.maintainiq.com/health` |
| Predictions page loads and Run Predictions completes for all 10 machines | ☐ | Manually verify in browser |
| No CORS errors in the browser console | ☐ | DevTools → Network → check pre-flight responses |
| Seed data is present (or new data ingested via API) | ☐ | `cd backend && python seed_data.py` |
| Error monitoring / logging enabled (CloudWatch / Sentry) | ☐ | Optional but recommended |
| Rollback plan documented (previous ECR image tag noted) | ☐ | `kubectl set image deployment/backend backend=$ECR_BACKEND:<prev-sha>` |

---

## Quick-start Commands

```bash
# ── Local development ──────────────────────────────────────────────────────
docker-compose up --build          # starts backend + PostgreSQL + frontend
cd backend && python seed_data.py  # populate demo data

# ── Backend tests ──────────────────────────────────────────────────────────
cd backend && python -m pytest tests/ -v

# ── Frontend tests ─────────────────────────────────────────────────────────
cd frontend && CI=true npm test -- --watchAll=false --forceExit

# ── Production build check ──────────────────────────────────────────────────
cd frontend && REACT_APP_API_URL=https://api.maintainiq.com npm run build

# ── Manual train + predict (against local Docker stack) ────────────────────
curl -X POST http://localhost:8000/api/predictions/train
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:8000/api/predictions/run/$i | python3 -m json.tool
done
```

---

*Last updated: June 2026 · MaintainIQ Platform v1.0*
