# IssueFlow – Comprehensive Final Project Report

**Project Title**: IssueFlow – AI-Powered Support & Issue Management Platform  
**Authors**: Full-Stack Engineering & QA Team  
**Version**: 1.0.0 (Phases 1–10 Complete)  
**Primary Database**: Supabase PostgreSQL (Cloud Instance)  
**AI Engine**: Google Gemini API (`gemini-3.5-flash-lite`)  
**Status**: Completed, Fully Tested, and Ready for Portfolio Presentation

---

## 1. Executive Summary

IssueFlow is a modern, enterprise-grade customer support, ticket tracking, and issue management platform inspired by industry leaders such as **Linear**, **Jira**, and **Zendesk**. 

The platform bridges real-time SQL analytics, role-based access control (RBAC), and Google Gemini AI into an integrated full-stack architecture. Users can create, prioritize, assign, and resolve customer support incidents while leveraging AI copilot capabilities for automated classification, urgency detection, sentiment analysis, and troubleshooting suggestions.

Over 10 structured development phases, the platform was conceived, developed, hardened, tested, containerized, and documented with strict adherence to industry best practices.

---

## 2. Problem Statement & Motivation

Customer support and IT service management teams frequently struggle with:
1. **Manual Triage Bottlenecks**: Sorting tickets into categories and determining true severity takes valuable agent time.
2. **Slow Resolution Times**: Agents often lack instant contextual troubleshooting guidance for common or repeating errors.
3. **Opaque Metrics**: Many platforms rely on superficial client-side calculations or delayed batch exports rather than live database aggregations.
4. **Security Vulnerabilities**: Naive implementations frequently suffer from Insecure Direct Object References (IDOR), allowing customers to inspect or modify other customers' tickets.

IssueFlow solves these challenges by combining:
- **Instant AI Triage**: Real-time classification and sentiment analysis using Google Gemini.
- **Strict Role-Based Authorization**: Administrative, agent, and customer permissions enforced at both the database query and API endpoint layers.
- **Live SQL Aggregation**: Instant KPIs, resolution rates, and trend analytics calculated directly in PostgreSQL.

---

## 3. Technology Stack & Architectural Overview

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

### 3.1 Frontend Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Lucide React Icons
- **State Management**: React Context (`AuthContext`, `TicketContext`, `ThemeContext`)
- **Routing**: React Router v7 with protected route guards
- **Form Handling & Validation**: React Hook Form + Zod
- **Data Visualization**: Recharts (Area, Bar, Donut, Line charts)
- **Notifications**: Sonner toast notifications
- **Production Server**: Nginx 1.27 Alpine (SPA rewrite routing fallback)

### 3.2 Backend Stack
- **Framework**: Python 3.12 + FastAPI + Uvicorn
- **ORM & Database**: SQLAlchemy 2.0 + Alembic migrations
- **Database**: Supabase PostgreSQL (Managed cloud instance via AWS session pooler)
- **Authentication**: Custom JWT (HS256) with standard 30-minute expiration
- **Password Security**: Passlib + bcrypt hashing
- **AI Integration**: Google GenAI SDK (`gemini-3.5-flash-lite`) with exponential backoff & jitter
- **Validation**: Pydantic v2 + Pydantic-Settings

### 3.3 DevOps & Quality Engineering
- **Containerization**: Multi-stage Dockerfiles (`python:3.12-slim`, `node:20-alpine`, `nginx:alpine`)
- **Orchestration**: Docker Compose with bridge networking and healthcheck dependencies
- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/ci.yml`) running dual parallel test jobs
- **Backend Testing**: Pytest (82 automated tests covering auth, tickets, teams, comments, AI, and security)
- **Frontend Testing**: Vitest + React Testing Library (16 automated tests covering UI components and mappers)

---

## 4. Phase-by-Phase Implementation Chronology

| Phase | Title | Key Milestones Delivered |
| :---: | :--- | :--- |
| **Phase 1** | Frontend UI & Interactive Prototyping | Responsive dashboard, ticket tables, filtering, sorting, theme switching, mock data layer. |
| **Phase 2** | FastAPI Backend Architecture | FastAPI project structure, Pydantic schemas, initial routing, healthcheck endpoint. |
| **Phase 3** | Supabase PostgreSQL & Alembic | Connected cloud Supabase instance via session pooler, Alembic migrations, SQLAlchemy models. |
| **Phase 4** | JWT Authentication & RBAC | bcrypt hashing, HS256 tokens, role hierarchy (ADMIN, AGENT, CUSTOMER), route dependencies. |
| **Phase 5** | Google Gemini AI Integration | Google GenAI SDK, automated priority detection, ticket classification, AI copilot responses. |
| **Phase 6** | Frontend-Backend API Connection | Centralized Axios client, JWT request interceptors, 401 logout listener, live ticket CRUD. |
| **Phase 7** | SQL Aggregated Analytics Engine | Replaced mock dashboard numbers with high-performance SQL `COUNT`, `GROUP BY`, and `DATE_TRUNC`. |
| **Phase 8** | QA Testing & Security Hardening | 82 Pytest tests, 16 Vitest tests, IDOR protections, Gemini 503 retry loop with jitter. |
| **Phase 9** | Dockerization & GitHub Actions CI | Backend & Frontend Dockerfiles, Docker Compose, Nginx SPA config, GitHub Actions workflow. |
| **Phase 10**| Final Validation & Portfolio | Full technical audit, portfolio documentation, architecture diagrams, interview demo script. |

---

## 5. Security Architecture & Audit Findings

### 5.1 Authentication & Token Lifecycle
- Passwords hashed using bcrypt with salt rounds. Plaintext passwords never stored or logged.
- JWT tokens signed with HMAC-SHA256 (`HS256`) and expire after exactly **30 minutes**.
- Logout purges `issueflow_token` and `issueflow_auth_user` from browser storage.

### 5.2 Role-Based Access Control (RBAC) & IDOR Defense
- **Customer Role**: Restricted to reading and updating tickets they personally authored (`created_by == current_user.id`). Attempting to read another customer's ticket returns HTTP 404/403. Cannot view internal comments, assign agents, or access the user roster.
- **Agent Role**: Can view all tickets, update statuses, assign agents, and post comments. Cannot delete tickets or manage administrative teams.
- **Admin Role**: Full system access, including ticket deletion, user creation, role assignment, and team management.

### 5.3 Production Safeguards
- `backend/app/main.py` enforces a production check: if `ENVIRONMENT=production`, the application actively refuses to seed the default development password `Admin@123` and logs a `CRITICAL` alert.
- `CORS_ORIGINS` restricts browser API calls to configured origins.
- All secrets (`DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`) are managed via environment variables and strictly excluded from Git.

---

## 6. Verification & Automated Testing Metrics

| Test Suite | Framework | Scope / Coverage | Results |
| :--- | :--- | :--- | :---: |
| **Backend Suite** | Pytest 9.2.0 | Auth, RBAC, Tickets, Comments, Teams, AI, Analytics, Security | **82 / 82 Passed** (100%) |
| **Frontend Suite** | Vitest 5.1.0 | Components, Auth Forms, Navigation, Utility Mappers | **16 / 16 Passed** (100%) |
| **TypeScript Validation** | `tsc -b` | Static type checking across all `src/` modules | **0 Errors** |
| **Vite Production Build** | Vite 8.3.8 | Minification, chunking, gzip asset generation | **Built in < 1.0s** |

---

## 7. Known Limitations & Future Roadmap

1. **Email / SMS Dispatching**: Currently, ticket assignment alerts and password reset notifications emit toast notifications and activity log entries. Integrating SendGrid or AWS SES would enable transactional emails.
2. **WebSocket Real-Time Updates**: Status updates require manual refresh or page navigation; adding WebSockets or Server-Sent Events (SSE) would enable live multi-agent sync.
3. **File Attachments**: Ticket descriptions currently support formatted text. Adding an S3 or Supabase Storage bucket would enable screenshot and PDF file uploads.

