# IssueFlow – Docker & Docker Compose Guide

This guide provides beginner-friendly, step-by-step instructions to build, run, and manage **IssueFlow** using Docker and Docker Compose.

---

## 1. Prerequisites

Before running IssueFlow with Docker, ensure you have:
1. **Docker Desktop** installed on Windows or macOS (or Docker Engine on Linux):
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - On Windows, ensure **WSL 2** backend is enabled during installation.
2. An active **Supabase PostgreSQL** database connection string (from Phase 1–3).
3. A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).

---

## 2. Docker Architecture Overview

IssueFlow runs as a multi-container architecture orchestrated by Docker Compose:

```
                          +-------------------------------------------------+
                          |                   User Browser                  |
                          +-------------------------------------------------+
                                      |                             |
                               Port 80| (Web UI)            Port 8000| (REST API / Swagger)
                                      v                             v
+-------------------------------------------+  +-------------------------------------------+
|             issueflow-frontend            |  |             issueflow-backend             |
|-------------------------------------------|  |-------------------------------------------|
| Base: nginx:1.27-alpine                   |  | Base: python:3.12-slim                    |
| SPA Routing (React Router fallback)       |  | User: non-root appuser (UID 1000)         |
| Serves static bundle built by Node 20     |  | Serves FastAPI via Uvicorn                |
| Healthcheck: /nginx-health                |  | Healthcheck: /api/health                  |
+-------------------------------------------+  +-------------------------------------------+
                     \                                      /
                      \                                    /
                       \====== issueflow-network =========/
                               (Bridge Network)
                                      |
                                      v
                       +-------------------------------+
                       |      Supabase PostgreSQL      |
                       |       (Cloud Database)        |
                       +-------------------------------+
```

---

## 3. Quick Start with Docker Compose

### Step 1: Prepare Environment Configuration
Copy `docker-compose.env.example` to `.env` in the project root:

```powershell
Copy-Item docker-compose.env.example .env
```

Open `.env` in your text editor and fill in your actual credentials:
- `DATABASE_URL`: Your Supabase PostgreSQL connection string (session pooler port 5432).
- `SECRET_KEY`: A secure random 64-character secret.
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `INITIAL_ADMIN_EMAIL`: `admin@issueflow.com` (or your preferred admin email).
- `INITIAL_ADMIN_PASSWORD`: Your desired admin password.

> [!IMPORTANT]
> The `.env` file contains sensitive credentials and is strictly excluded by `.gitignore`. Never commit `.env` to GitHub.

---

### Step 2: Build and Start Containers
From the root directory where `docker-compose.yml` is located:

```bash
docker compose up --build -d
```

- `--build`: Forces Docker to build fresh images for both frontend and backend.
- `-d`: Runs containers in detached (background) mode.

---

### Step 3: Verify Container Health
Check running containers and their health status:

```bash
docker compose ps
```

You should see:
- `issueflow-backend`: Running on port `0.0.0.0:8000->8000/tcp` (healthy)
- `issueflow-frontend`: Running on port `0.0.0.0:80->80/tcp` (healthy)

Test backend health directly:
```bash
curl http://localhost:8000/api/health
```

Expected output:
```json
{
  "status": "healthy",
  "application": "IssueFlow",
  "version": "1.0.0",
  "database": {
    "provider": "Supabase PostgreSQL",
    "connected": true
  },
  "ai": {
    "provider": "Google Gemini",
    "model": "gemini-3.5-flash-lite",
    "configured": true,
    "status": "ready"
  }
}
```

---

### Step 4: Access the Application
- **Frontend Application**: Open your browser at [http://localhost](http://localhost) (or [http://localhost:80](http://localhost:80)).
- **Interactive API Documentation (Swagger)**: Open [http://localhost:8000/docs](http://localhost:8000/docs).
- **Alternative ReDoc Docs**: Open [http://localhost:8000/redoc](http://localhost:8000/redoc).

Default Admin Credentials:
- **Email**: `admin@issueflow.com` (or value set in `INITIAL_ADMIN_EMAIL`)
- **Password**: `Admin@123` (or value set in `INITIAL_ADMIN_PASSWORD`)

---

## 4. Useful Docker Compose Commands

| Command | Description |
| :--- | :--- |
| `docker compose up --build` | Build images and start containers with live logs |
| `docker compose up -d` | Start existing containers in background |
| `docker compose stop` | Pause containers without removing them |
| `docker compose down` | Stop and remove containers and networks |
| `docker compose down -v` | Stop containers and remove named volumes |
| `docker compose logs -f` | Stream logs from all running containers |
| `docker compose logs backend -f` | Stream logs specifically from FastAPI backend |
| `docker compose logs frontend -f` | Stream logs specifically from Nginx frontend |
| `docker compose restart backend` | Restart backend service without stopping frontend |

---

## 5. Building and Running Containers Individually

If you prefer building and running containers without Docker Compose:

### Backend:
```bash
# 1. Build backend image
docker build -t issueflow-backend ./backend

# 2. Run backend container
docker run -d --name issueflow-backend -p 8000:8000 \
  -e DATABASE_URL="postgresql://postgres.[REF]:[PASS]@[HOST]:5432/postgres" \
  -e SECRET_KEY="your-secret-key" \
  -e GEMINI_API_KEY="your-gemini-key" \
  -e CORS_ORIGINS="http://localhost,http://localhost:80,http://localhost:5173" \
  issueflow-backend
```

### Frontend:
```bash
# 1. Build frontend image (passing backend API URL at build time)
docker build -t issueflow-frontend --build-arg VITE_API_BASE_URL="http://localhost:8000" .

# 2. Run frontend container
docker run -d --name issueflow-frontend -p 80:80 issueflow-frontend
```

---

## 6. Troubleshooting Common Docker Issues

### Issue 1: Port Conflict (Port 80 or 8000 already in use)
- **Symptom**: `bind: address already in use`
- **Cause**: Another service (like IIS, Apache, Skype, or local uvicorn) is using port 80 or 8000.
- **Fix**: In `docker-compose.yml`, change the host port:
  ```yaml
  ports:
    - "3000:80"    # Access frontend on http://localhost:3000
  ```
  ```yaml
  ports:
    - "8001:8000"  # Access backend on http://localhost:8001
  ```

### Issue 2: Backend Reports "database_disconnected"
- **Cause**: Supabase connection string is incorrect or network cannot reach Supabase AWS pooler.
- **Fix**: Verify `DATABASE_URL` in `.env`. Ensure your Supabase database password contains no unencoded special characters, and use port `5432` with the session pooler.

### Issue 3: React Router Returns 404 on Page Refresh
- **Cause**: Nginx is missing SPA rewrite rule.
- **Fix**: The provided `nginx.conf` includes `try_files $uri $uri/ /index.html;` which solves this issue automatically. Ensure `nginx.conf` is loaded in the image.

