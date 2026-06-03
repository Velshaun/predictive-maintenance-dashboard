# 🔧 Predictive Maintenance Dashboard

An AI-powered industrial equipment monitoring dashboard that uses machine learning to predict maintenance needs and Claude AI to generate natural language maintenance insights.

## Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, MUI, Recharts, React Router |
| **Backend** | FastAPI (Python), SQLAlchemy, Pydantic |
| **Database** | PostgreSQL 15 |
| **ML** | scikit-learn (maintenance prediction) |
| **AI** | Anthropic Claude (`claude-sonnet-4-20250514`) |
| **Containers** | Docker, Docker Compose |
| **Infrastructure** | Terraform, AWS EKS, AWS RDS, AWS ECR |
| **Orchestration** | Kubernetes |

---

## Local Development (Docker Compose)

### Prerequisites
- Docker Desktop
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Configure environment

Copy the example env and add your API key:
```bash
cp backend/.env.example backend/.env   # edit DATABASE_URL and ANTHROPIC_API_KEY
```

Or ensure the root `.env` has:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 2. Start all services

```bash
docker-compose up --build
```

To run in the background:
```bash
docker-compose up --build -d
```

To stop:
```bash
docker-compose down
```

### 3. Verify

| Service | URL |
|---|---|
| React Dashboard | http://localhost:3000 |
| FastAPI (Swagger docs) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

---

## Local Development (without Docker)

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start
```

---

## AWS Infrastructure (Terraform)

Infrastructure is defined in `infrastructure/terraform/` and provisions:
- **VPC** — 2 AZs, public + private subnets, NAT Gateway
- **EKS** — Kubernetes 1.29, managed node group (`t3.medium`, 1–3 nodes)
- **RDS** — PostgreSQL 15 (`db.t3.micro`) in private subnets
- **ECR** — Two private image repositories (backend + frontend)

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform >= 1.5 installed

### 1. Create the Terraform state bucket

```bash
aws s3 mb s3://YOUR-TERRAFORM-STATE-BUCKET --region us-east-2
```

Then update the `bucket` value in `infrastructure/terraform/main.tf`:
```hcl
backend "s3" {
  bucket = "YOUR-TERRAFORM-STATE-BUCKET"
  ...
}
```

### 2. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 3. Preview the plan

```bash
terraform plan -var='db_password=YourSecurePassword123'
```

### 4. Apply

```bash
terraform apply -var='db_password=YourSecurePassword123'
```

> ⚠️ This will provision real AWS resources and incur costs. Review the plan output before confirming.

---

## Kubernetes Deployment (Phase 9)

### 9.1 Configure kubectl for EKS

After `terraform apply` completes, point your local `kubectl` at the new cluster:

```bash
aws eks update-kubeconfig --region us-east-2 --name maintenance-dashboard-cluster
```

Verify the nodes are ready:

```bash
kubectl get nodes
# NAME                          STATUS   ROLES    AGE   VERSION
# ip-10-0-1-x.ec2.internal     Ready    <none>   ...   v1.29.x
# ip-10-0-2-x.ec2.internal     Ready    <none>   ...   v1.29.x
```

All subsequent `kubectl` commands will target this cluster until you switch contexts.

### 9.4 Create Kubernetes Secrets

Before deploying, create the `app-secrets` Secret that the backend pods reference:

```bash
kubectl create secret generic app-secrets \
  --from-literal=database-url='postgresql://postgres:YourPass@YOUR_RDS_ENDPOINT:5432/maintenance_db' \
  --from-literal=anthropic-key='your_anthropic_api_key'
```

> Replace `YOUR_RDS_ENDPOINT` with the RDS endpoint from Terraform output (`terraform output` after apply), `YourPass` with the password used during `terraform apply`, and note the region is `us-east-2`.

Verify the secret was created:
```bash
kubectl get secret app-secrets
```

### 9.5 Apply Kubernetes Manifests

Deploy the backend and frontend to the EKS cluster:

```bash
kubectl apply -f infrastructure/kubernetes/backend-deployment.yml
kubectl apply -f infrastructure/kubernetes/frontend-deployment.yml
```

Check pod and service status:

```bash
kubectl get pods
# NAME                        READY   STATUS    RESTARTS   AGE
# backend-xxxxxxxxx-xxxxx     1/1     Running   0          30s
# backend-xxxxxxxxx-xxxxx     1/1     Running   0          30s
# frontend-xxxxxxxxx-xxxxx    1/1     Running   0          25s
# frontend-xxxxxxxxx-xxxxx    1/1     Running   0          25s

kubectl get services
# NAME               TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)
# backend-service    ClusterIP      10.100.x.x      <none>          8000/TCP
# frontend-service   LoadBalancer   10.100.x.x      <pending>       80:xxxxx/TCP
```

Get the public LoadBalancer URL (takes 2–3 minutes to provision):

```bash
kubectl get service frontend-service
# EXTERNAL-IP will change from <pending> to an AWS ELB hostname
# e.g. xxxxxxxx.us-east-1.elb.amazonaws.com
```

Once `EXTERNAL-IP` is populated, the dashboard is live at that URL on port 80.

---

## CI/CD (GitHub Actions)

The workflow at `.github/workflows/deploy.yml` runs automatically:
- **On push to `main`** → runs tests + builds Docker images + deploys to EKS
- **On PR to `develop`** → runs tests + build only (no deploy)

### Required GitHub Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | Your IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key |
| `AWS_REGION` | `us-east-2` |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `ECR_BACKEND_REPO` | `maintenance-dashboard-backend` |
| `ECR_FRONTEND_REPO` | `maintenance-dashboard-frontend` |
| `EKS_CLUSTER_NAME` | `maintenance-dashboard-cluster` |

---

## Project Structure

```
predictive-maintenance-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (machines, logs, predictions, ai_insights)
│   │   ├── ml/           # scikit-learn predictor
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic
│   │   ├── database.py
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # StatusBadge
│   │   ├── pages/        # Dashboard, MachinePage
│   │   └── utils/        # api.js (Axios helpers)
│   └── Dockerfile
├── infrastructure/
│   ├── terraform/        # main.tf, variables.tf, rds.tf, ecr.tf
│   └── kubernetes/       # K8s manifests (Phase 9)
├── docker-compose.yml
└── .env
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/machines/` | List all machines |
| `GET` | `/api/machines/{id}` | Get machine detail |
| `POST` | `/api/machines/` | Create machine |
| `GET` | `/api/machines/{id}/logs` | Get maintenance logs |
| `POST` | `/api/predictions/predict` | Run ML prediction |
| `POST` | `/api/ai/insight` | Get Claude AI insight |
| `GET` | `/api/ai/summary/{id}` | Rule-based sensor summary |
| `GET` | `/api/ai/fleet-health` | Fleet health score |
| `GET` | `/health` | Health check |
