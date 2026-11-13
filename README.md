# IssueFlow – AI-Powered Support & Issue Management Platform

[![IssueFlow CI Pipeline](https://github.com/vimalraj/issueflow/actions/workflows/ci.yml/badge.svg)](https://github.com/vimalraj/issueflow/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.3-61DAFB.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

**IssueFlow** is a modern, enterprise-grade customer support, ticket tracking, and issue management platform inspired by **Linear**, **Jira**, and **Zendesk**. It integrates real-time SQL analytics, role-based access control (RBAC), and Google Gemini AI for automated ticket priority prediction, sentiment analysis, and response generation.

---

## 🎯 Problem Statement

Support and IT engineering teams spend significant manual effort:
- Triaging, categorizing, and determining the severity of incoming support tickets.
- Crafting repetitive troubleshooting steps for common technical incidents.
- Calculating metrics and queue velocities through slow, client-side batch computations.
- Mitigating Insecure Direct Object References (IDOR) where users could access other customer records.

**IssueFlow** solves these issues with:
1. **Automated AI Triage**: Instant category, priority, and sentiment detection using Google Gemini.
2. **AI Copilot Troubleshooting**: Generates root causes and actionable fix suggestions insertable with 1 click.
3. **Strict RBAC & IDOR Protections**: Automatic role scoping at both the database query and API gateway layers.
4. **Live SQL Aggregation**: Real-time KPI calculations and trend charts directly in Supabase PostgreSQL.

---

## 🏗️ System Architecture & Tech Stack

```
                                  +---------------------------------------+
                                  |         User Browser / Client         |
                                  +---------------------------------------+
                                        |                           |
                            HTTP / Port 80                 HTTP / Port 8000
                                (SPA UI)                     (REST APIs)
                                        v                           v
+---------------------------------------------+  +---------------------------------------------+
|               React Frontend                |  |               FastAPI Backend               |
|---------------------------------------------|  |---------------------------------------------|
| React 19 + TypeScript + Vite                |  | Python 3.12 + FastAPI + Uvicorn             |
| Tailwind CSS + Lucide Icons                 |  | SQLAlchemy 2.0 ORM + Alembic                |
| Recharts Visualizations                     |  | Custom JWT (HS256) + bcrypt Hashing         |
| SPA Routing (React Router v7)               |  | Role-Based Access Control (Admin/Agent/User)|
| Centralized Axios Interceptors (Auth+Retry) |  | SQL-Aggregated Analytics Engine             |
| Served via Production Nginx                 |  | Google GenAI SDK (gemini-3.5-flash-lite)    |
+---------------------------------------------+  +---------------------------------------------+
                                                                |              |
                                               SQLAlchemy (Port 5432)          | Google GenAI SDK
                                                                v              v
                                             +--------------------+  +--------------------+
                                             |      Supabase      |  |   Google Gemini    |
                                             |  PostgreSQL Cloud  |  |      AI API        |
                                             +--------------------+  +--------------------+
```

---

## ✨ Key Features

- 🔐 **Custom JWT Authentication & RBAC**: Secure sign-in and registration with bcrypt password hashing and standard 30-minute token lifecycles.
- 🛡️ **IDOR-Protected Scoping**: Customer roles are strictly scoped to their own submitted tickets, while Staff and Admins manage the universal queue.
- 🤖 **Google Gemini AI Copilot (`gemini-3.5-flash-lite`)**: Automated priority detection, incident categorization, sentiment polarity, and 1-click troubleshooting resolution suggestions.
- 🔄 **Resilient AI Pipeline**: Jittered exponential backoff retry loop (`1s, 2s, 4s`) that gracefully recovers from upstream demand spikes.
- 📊 **Real-Time SQL Analytics**: High-performance aggregations (`COUNT`, `GROUP BY`, `DATE_TRUNC`) visualized with interactive Recharts area, bar, and donut charts.
- 👥 **Team & Workload Management**: Support agent directory, workload metrics, availability indicators, and department filtering.
- 💬 **Discussion & Activity History**: Chronological comments thread with author-or-admin deletion permissions and status audit logging.
- 🌓 **Modern UI/UX**: Dark and Light theme switching, collapsible responsive sidebar, mobile drawer, and accessible keyboard controls.

---

## ⚡ Quick Start Options

You can run IssueFlow locally using **Docker Compose** or directly on your host machine.

### Option A: Running with Docker Compose (Recommended)

#### 1. Copy Docker Environment Template
```bash
cp docker-compose.env.example .env
```
*(On Windows PowerShell: `Copy-Item docker-compose.env.example .env`)*

#### 2. Configure Credentials in `.env`
Fill in your Supabase connection string and Gemini API key:
- `DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@[HOST]:5432/postgres`
- `GEMINI_API_KEY=your_gemini_api_key`
- `SECRET_KEY=generate_a_secure_random_key`

#### 3. Start Containers
```bash
docker compose up --build -d
```

#### 4. Access the Application
- **Frontend App**: [http://localhost](http://localhost) (Port 80)
- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

Detailed instructions and troubleshooting are available in [docs/DOCKER_GUIDE.md](file:///c:/Users/vimalraj/Documents/Issueflow/docs/DOCKER_GUIDE.md).

---

### Option B: Running Locally Without Docker

#### Backend Setup:
```powershell
cd backend

# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Linux/macOS: source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure backend/.env
Copy-Item .env.example .env
# Edit .env with your DATABASE_URL, GEMINI_API_KEY, and SECRET_KEY

# 4. Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup:
```powershell
# In project root
npm install
npm run dev
```
Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🔑 Default Administrator Credentials

Upon first startup, the backend automatically seeds the default administrator account (in development mode):

- **Email**: `admin@issueflow.com`
- **Password**: `Admin@123`
- **Role**: `admin`

> [!IMPORTANT]
> When `ENVIRONMENT=production`, default admin password `Admin@123` is actively blocked. Set a strong, custom `INITIAL_ADMIN_PASSWORD` in your production environment before deploying.

---

## 📡 Core REST API Endpoints

Interactive Swagger documentation is available at `/docs`. Below is a quick reference:

| Route | Method | Description | Access Scope |
| :--- | :---: | :--- | :--- |
| `/api/auth/register` | `POST` | Register a new customer account | Public |
| `/api/auth/login` | `POST` | Authenticate user & return JWT token | Public |
| `/api/auth/me` | `GET` | Retrieve logged-in user profile | Authenticated |
| `/api/auth/change-password` | `POST` | Change account password | Authenticated |
| `/api/tickets/` | `GET` | List tickets (filtered by role & criteria) | Authenticated |
| `/api/tickets/` | `POST` | Create a new support ticket | Authenticated |
| `/api/tickets/{id}` | `GET` | Retrieve ticket details & comments | Owner / Staff / Admin |
| `/api/tickets/{id}/status` | `PATCH` | Update ticket status | Staff / Admin |
| `/api/tickets/{id}/assign` | `PATCH` | Assign ticket to an agent | Staff / Admin |
| `/api/tickets/{id}` | `DELETE` | Delete ticket record | Admin Only |
| `/api/comments/` | `POST` | Add comment to ticket thread | Owner / Staff / Admin |
| `/api/comments/{id}` | `DELETE` | Remove comment | Author / Admin Only |
| `/api/users/` | `GET/POST`| User roster & staff creation | Admin Only |
| `/api/teams/` | `GET/POST`| Support departments & teams | Admin Only |
| `/api/analytics/overview` | `GET` | Real-time queue metrics & KPIs | Authenticated |
| `/api/analytics/agent-performance` | `GET` | Resolution rates per agent | Staff / Admin |
| `/api/ai/classify` | `POST` | Auto-classify category using Gemini | Authenticated |
| `/api/ai/priority` | `POST` | Predict priority and urgency factors | Authenticated |
| `/api/ai/suggest-resolution` | `POST` | Generate root causes & fixes | Authenticated |
| `/api/health` | `GET` | PostgreSQL & Gemini connectivity check | Public |

---

## 🧪 Automated Testing Suites

IssueFlow is verified by automated test suites for both frontend and backend:

### 1. Backend Pytest Suite (82 Tests)
Tests cover JWT authentication, RBAC authorization, ticket lifecycle, comments, teams, SQL analytics, and Gemini AI retry handling:

```powershell
cd backend
.\.venv\Scripts\pytest tests/ -v
cd ..
```
*Result: **82 passed** (100% pass rate).*

### 2. Frontend Vitest Suite (16 Tests)
Tests cover UI components, authentication forms, navigation bars, and data mappers:

```powershell
npm run test
```
*Result: **16 passed** (100% pass rate).*

### 3. TypeScript Type Validation & Build
```powershell
npm run build
```
*Result: **0 type errors**, clean Vite production bundle built in `< 1.0s`.*

---

## 🖼️ Application Screenshots Guide

Suggested visual walkthrough for portfolio and demonstrations:

| Screenshot | Description |
| :--- | :--- |
| **1. Executive Dashboard** | Real-time Recharts ticket velocity area chart, status donut, and resolution rate scorecards. |
| **2. Ticket Queue & Filters** | All-tickets table with multi-attribute filtering (Status, Priority, Category) and search. |
| **3. AI Copilot Panel** | Gemini AI panel displaying auto-generated summary, sentiment score, and 1-click resolution insertion. |
| **4. Ticket Creation Form** | Dynamic Zod-validated ticket submission form with "Run AI Triage" suggestion pill active. |
| **5. Support Team Roster** | Admin view of agent workloads, assigned vs. resolved ratios, and "Add Team Member" modal. |
| **6. Real-Time Analytics** | 30-day ticket trends, agent performance scorecards, and department volume distributions. |

---

## 📚 Complete Project Documentation

- 🏛️ [System Architecture & Design](file:///c:/Users/vimalraj/Documents/Issueflow/docs/ARCHITECTURE.md): Mermaid diagrams, ER schemas, authentication lifecycles.
- 💼 [Portfolio & Interview Guide](file:///c:/Users/vimalraj/Documents/Issueflow/docs/PORTFOLIO_GUIDE.md): Resume bullet points, 6 technical talking points, demo script, and LinkedIn draft.
- 🧪 [Final Quality Assurance Report](file:///c:/Users/vimalraj/Documents/Issueflow/docs/FINAL_TEST_REPORT.md): Breakdown of all 98 automated tests across frontend and backend.
- 📋 [Comprehensive Project Report](file:///c:/Users/vimalraj/Documents/Issueflow/docs/FINAL_PROJECT_REPORT.md): Detailed 10-phase development chronology and technical outcomes.
- 🐳 [Docker & Compose Guide](file:///c:/Users/vimalraj/Documents/Issueflow/docs/DOCKER_GUIDE.md): Multi-container orchestration and troubleshooting.
- ⚙️ [GitHub Actions CI/CD Guide](file:///c:/Users/vimalraj/Documents/Issueflow/docs/GITHUB_ACTIONS_GUIDE.md): Continuous integration pipeline explanation.
- ☁️ [Production Deployment Guide](file:///c:/Users/vimalraj/Documents/Issueflow/docs/DEPLOYMENT_GUIDE.md): Step-by-step free tier guide for Render, Vercel, and Supabase.
- 🔐 [Environment Variables Guide](file:///c:/Users/vimalraj/Documents/Issueflow/docs/ENVIRONMENT_VARIABLES.md): Comprehensive configuration dictionary.

---

## 📄 License
This project is licensed under the MIT License.
