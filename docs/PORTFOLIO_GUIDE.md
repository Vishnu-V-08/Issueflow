# IssueFlow – Developer Portfolio & Interview Guide

This guide provides ready-to-use resume bullet points, technical talking points, interview demonstration scripts, and social media announcements to showcase **IssueFlow** in your software engineering portfolio.

---

## 1. Resume Project Description

### Option A: Full-Stack Engineer / Backend Focus
**IssueFlow | AI-Powered Support & Issue Management Platform**  
*Tech Stack: Python, FastAPI, SQLAlchemy, Supabase PostgreSQL, Google Gemini API, React 19, TypeScript, Docker*
- Architected and built an enterprise-grade issue tracking platform handling end-to-end incident lifecycles, role-based authorization, and real-time SQL analytics.
- Engineered custom JWT authentication with bcrypt password hashing, 30-minute access token expiration, and fine-grained RBAC protecting against IDOR attacks.
- Integrated Google Gemini AI (`gemini-3.5-flash-lite`) via Google GenAI SDK to automate ticket classification, urgency detection, and troubleshooting resolution generation with exponential backoff and jittered retry logic.
- Implemented high-performance SQL analytical aggregation in Supabase PostgreSQL, reducing dashboard calculation latency to `< 50ms`.
- Built automated test pipelines achieving **100% test pass rates across 82 backend Pytest and 16 frontend Vitest tests**, orchestrated via GitHub Actions CI/CD.

### Option B: Full-Stack / Frontend Focus
**IssueFlow | AI-Powered Customer Support Platform**  
*Tech Stack: React 19, TypeScript, Vite, Tailwind CSS, Recharts, FastAPI, Supabase PostgreSQL, Docker*
- Developed a high-performance, responsive single-page application (SPA) featuring accessible dashboard widgets, multi-attribute ticket filtering, and Recharts trend visualizations.
- Built a centralized Axios API client with automatic JWT token injection, response error normalization, and 401 automatic session expiration listeners.
- Designed an interactive AI Copilot panel enabling support agents to triage incidents and insert Gemini-generated troubleshooting steps with 1 click.
- Containerized frontend with multi-stage Docker builds (`node:20-alpine` builder and `nginx:1.27-alpine` runner) with client-side SPA fallback routing and Gzip compression.

---

## 2. 6 Core Technical Highlights for Interviews

When asked *"Tell me about a challenging technical problem you solved on this project"*, highlight any of these 6 architecture decisions:

### Highlight 1: Resilient AI Pipeline with Exponential Backoff & Jitter
- **Challenge**: The Google Gemini API occasionally encounters upstream demand spikes returning temporary HTTP 503 errors.
- **Solution**: Engineered an exponential backoff retry loop (`base_delay * 2^attempt`) with randomized jitter in `GeminiService._execute_prompt()`. The system distinguishes between client errors (401 invalid key, 429 quota) and transient server errors (503), eliminating transient failures without endless loops.

### Highlight 2: Insecure Direct Object Reference (IDOR) Protection
- **Challenge**: Customer users must never access, edit, or comment on support tickets belonging to other customer organizations.
- **Solution**: Built strict role-aware authorization into the SQLAlchemy query layer. For `CUSTOMER` roles, all queries automatically append `WHERE created_by = current_user.id`. Any unauthorized access attempt returns a 404/403 without revealing the existence of other records.

### Highlight 3: Production Database Aggregations vs. Client-Side Compute
- **Challenge**: Calculating resolution rates, weekly ticket velocities, and agent workloads across thousands of records in JavaScript creates high browser memory usage and sluggish UI.
- **Solution**: Pushed analytics computation into PostgreSQL using SQL window functions, `DATE_TRUNC`, and conditional `COUNT(CASE WHEN...)` statements, delivering instant response times regardless of data volume.

### Highlight 4: Production Admin Password Seeding Safeguard
- **Challenge**: Development setups often seed default demo credentials (e.g. `Admin@123`), which pose a major security vulnerability if deployed to production.
- **Solution**: Added an environment guard in `main.py` lifespan: when `ENVIRONMENT=production`, the application actively verifies that `INITIAL_ADMIN_PASSWORD` is not the default password and has a minimum length, blocking insecure auto-seeding with a `CRITICAL` audit log.

### Highlight 5: Multi-Stage Dockerization & SPA Fallback Routing
- **Challenge**: React Router SPAs return 404 errors when users refresh deep URLs like `/tickets/12` under standard Nginx configurations.
- **Solution**: Crafted a multi-stage Dockerfile compiling the React app via Node 20 and serving with Nginx Alpine using `try_files $uri $uri/ /index.html;`, reducing image size to under 25MB while guaranteeing flawless client-side routing.

### Highlight 6: Comprehensive Automated CI/CD Testing
- **Challenge**: Ensuring full backwards compatibility across authentication, database queries, and AI features before merging code.
- **Solution**: Configured GitHub Actions dual-job workflow running 82 Pytest tests and 16 Vitest tests with isolated SQLite fixtures, guaranteeing that no pull request breaks the application.

---

## 3. Technologies & Skills Demonstrated

| Domain | Technologies & Concepts |
| :--- | :--- |
| **Backend** | Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2.0, Alembic, Pydantic v2, RESTful API Design |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, React Router v7 |
| **Database** | Supabase PostgreSQL, SQL Aggregation, Connection Pooling, Migrations, Indexing |
| **Security** | JWT (HS256), bcrypt Password Hashing, RBAC, IDOR Mitigation, CORS, Environment Isolation |
| **AI / GenAI** | Google Gemini API (`gemini-3.5-flash-lite`), Prompt Engineering, Exponential Backoff |
| **DevOps & QA** | Docker, Docker Compose, Nginx, GitHub Actions CI/CD, Pytest, Vitest, React Testing Library |

---

## 4. Suggested Application Screenshots for Portfolio

When preparing your portfolio website or GitHub README, capture these 6 key screenshots:

1. **Dashboard Overview**: Showcases Recharts area trends, status donuts, resolution rate KPIs, and recent tickets table.
2. **All Tickets Queue**: Shows search bar, severity badges, category filtering, and pagination.
3. **AI Copilot in Ticket Details**: Highlights the Gemini AI panel displaying auto-generated summary, sentiment score, and the "Insert into Comment" button.
4. **Create Ticket with Live AI Triage**: Shows the user form with the "Run AI Triage" suggestion pill active.
5. **Team Management (Admin View)**: Shows team cards, agent workloads, and the "Add Team Member" modal.
6. **Analytics & Performance Reports**: Highlights the 30-day resolution rate, agent scorecards, and department distribution charts.

---

## 5. 3–5 Minute Live Demonstration Script

Use this script during technical interviews to present a structured walkthrough:

### Minute 0:00 – 1:00: Problem & Architecture Introduction
> *"Hi! Today I'm walking through IssueFlow, an AI-powered customer support and issue management platform I built. The goal of IssueFlow is to eliminate support triage bottlenecks and give agents instant AI troubleshooting assistance. The tech stack uses React 19 and TypeScript on the frontend, FastAPI and SQLAlchemy on the backend, Supabase PostgreSQL in the cloud, and Google's Gemini API for intelligence."*

### Minute 1:00 – 2:00: Authentication & Role-Based Access Control
> *"I'll sign in as the administrator using our JWT authentication system. Under the hood, passwords are encrypted with bcrypt, and tokens expire in 30 minutes. If I were logged in as a customer, my view would be strictly scoped to my own submitted tickets to prevent IDOR vulnerabilities. As an admin or agent, I have access to the complete queue and team roster."*

### Minute 2:00 – 3:30: Live Ticket Flow & Gemini AI Copilot
> *"Let's open an existing ticket. On the right side, you can see our AI Copilot panel powered by Google's Gemini 3.5 Flash model. It automatically analyzes the customer's issue, detects urgency, computes sentiment, and generates a recommended troubleshooting fix. With one click, an agent can insert this solution directly into the discussion thread. I also engineered an exponential backoff retry loop with jitter to ensure temporary AI upstream demand spikes never cause a failure."*

### Minute 3:30 – 4:30: Real-Time SQL Analytics & Testing
> *"Next, on the Analytics tab, notice these metrics: resolution rates, ticket trends, and agent performance. Rather than computing these in browser memory, our backend runs optimized SQL aggregation directly on Supabase PostgreSQL. Finally, the codebase is protected by an automated CI/CD pipeline running 82 backend Pytest tests and 16 Vitest frontend tests on every commit."*

---

## 6. GitHub Repository Metadata

- **Repository Title**: `issueflow`
- **Short Tagline**: Enterprise-grade AI support & issue management platform built with FastAPI, React, Supabase PostgreSQL, and Google Gemini AI.
- **Topics**: `fastapi`, `react`, `typescript`, `gemini-api`, `supabase`, `postgresql`, `docker`, `tailwind-css`, `recharts`, `pytest`, `jwt-authentication`

---

## 7. LinkedIn Project Announcement Draft

```text
🚀 Excited to share my latest full-stack project: IssueFlow – an AI-Powered Support & Issue Management Platform!

Inspired by tools like Linear and Zendesk, IssueFlow automates customer support workflows, incident triage, and resolution tracking.

Key Architectural Highlights:
⚡ Full-Stack Architecture: React 19 + Vite + TypeScript frontend paired with Python 3.12 + FastAPI REST backend.
🤖 Google Gemini AI Copilot: Built-in ticket classification, sentiment analysis, and troubleshooting suggestions with exponential backoff & jitter retry handling.
🔐 Robust Security: Custom JWT authentication (HS256), bcrypt password hashing, and role-based access control (RBAC) protecting against IDOR attacks.
📊 High-Performance SQL Analytics: Real-time PostgreSQL aggregation for sub-50ms dashboard KPIs and trend visualizations with Recharts.
🐳 DevOps & Testing: Multi-stage Dockerfiles, Docker Compose, Nginx SPA routing, and GitHub Actions CI running 82 Pytest + 16 Vitest tests with a 100% pass rate.

Check out the full open-source repository and architectural breakdown on GitHub! 👇
[Link to your GitHub repo]

#SoftwareEngineering #FastAPI #React #TypeScript #Python #GoogleGemini #PostgreSQL #Docker #FullStack
```

