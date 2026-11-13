# IssueFlow – System Architecture & Technical Design

This document details the complete end-to-end architectural design, database entity relationships, request lifecycles, and security layers of the **IssueFlow** platform.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser)"]
        UI["React 19 + TypeScript SPA"]
        AxiosClient["Axios Interceptor Layer"]
        Router["React Router v7 Guards"]
    end

    subgraph Gateway["Web & Ingress Tier"]
        Nginx["Nginx Production Server (Port 80)"]
        CORS["CORS Middleware"]
    end

    subgraph AppServer["Application Tier (FastAPI - Port 8000)"]
        FastAPI["FastAPI Routing Engine"]
        AuthMiddleware["JWT Authentication & RBAC Layer"]
        Services["Business Logic Services"]
        AnalyticsEngine["SQL Analytics Aggregation Engine"]
        AIService["Gemini AI Service with Jitter Retry"]
    end

    subgraph DataStore["Data Tier"]
        Supabase[("Supabase PostgreSQL Cloud DB")]
        GeminiAPI["Google Gemini AI Cloud (gemini-3.5-flash-lite)"]
    end

    UI --> Router --> AxiosClient
    AxiosClient -->|"HTTP Requests + Bearer Token"| Nginx
    Nginx --> CORS --> FastAPI
    FastAPI --> AuthMiddleware --> Services
    Services --> AnalyticsEngine
    Services --> AIService
    AnalyticsEngine -->|"SQL Queries (Session Pooler Port 5432)"| Supabase
    AIService -->|"Google GenAI SDK (HTTPS)"| GeminiAPI
```

---

## 2. Database Entity-Relationship (ER) Schema

The database runs on **Supabase PostgreSQL** and is managed via **SQLAlchemy 2.0** ORM models and version-controlled **Alembic** migrations.

```mermaid
erDiagram
    USERS ||--o{ TICKETS : "creates (created_by)"
    USERS ||--o{ TICKETS : "assigned to (assigned_to)"
    USERS ||--o{ COMMENTS : "authors (user_id)"
    USERS ||--o{ TICKET_HISTORY : "initiates (changed_by)"
    USERS }o--o{ USER_TEAMS : "belongs to"
    TEAMS ||--o{ USER_TEAMS : "contains"
    TICKETS ||--o{ COMMENTS : "contains (ticket_id)"
    TICKETS ||--o{ TICKET_HISTORY : "tracks (ticket_id)"

    USERS {
        int id PK
        string email UK
        string hashed_password
        string full_name
        string role "ADMIN | AGENT | CUSTOMER"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    TICKETS {
        int id PK
        string ticket_number UK "ISS-XXXX"
        string title
        text description
        string category "TECHNICAL_ISSUE | BILLING | ACCOUNT | BUG_REPORT | FEATURE_REQUEST | GENERAL_INQUIRY"
        string priority "LOW | MEDIUM | HIGH | CRITICAL"
        string status "OPEN | IN_PROGRESS | PENDING | RESOLVED | CLOSED"
        int created_by FK
        int assigned_to FK
        text ai_summary
        timestamp created_at
        timestamp updated_at
    }

    COMMENTS {
        int id PK
        int ticket_id FK
        int user_id FK
        text content
        timestamp created_at
    }

    TICKET_HISTORY {
        int id PK
        int ticket_id FK
        int changed_by FK
        string old_status
        string new_status
        timestamp created_at
    }

    TEAMS {
        int id PK
        string name UK
        string description
        timestamp created_at
    }

    USER_TEAMS {
        int user_id PK, FK
        int team_id PK, FK
    }
```

---

## 3. Authentication & JWT Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant API as FastAPI /api/auth
    participant DB as Supabase PostgreSQL

    Note over User, DB: Registration Flow (Customer Only)
    User->>API: POST /api/auth/register {full_name, email, password}
    API->>DB: Query User by email
    alt Email already registered
        API-->>User: 400 Bad Request ("Email already registered")
    else New Account
        API->>API: Hash password via bcrypt
        API->>DB: INSERT User (role = CUSTOMER)
        API->>API: Generate HS256 JWT Token (30 min expiry)
        API-->>User: 201 Created {access_token, token_type: "bearer", user}
    end

    Note over User, DB: Login Flow
    User->>API: POST /api/auth/login {email, password}
    API->>DB: SELECT User WHERE email = email
    API->>API: Verify password hash via bcrypt
    alt Invalid password or inactive
        API-->>User: 401 Unauthorized ("Invalid credentials")
    else Authenticated
        API->>API: Generate HS256 JWT Token (30 min expiry)
        API-->>User: 200 OK {access_token, token_type: "bearer", user}
    end

    Note over User, DB: Authenticated API Requests
    User->>API: GET /api/tickets/ (Header: Authorization: Bearer <token>)
    API->>API: Decode & verify token signature + expiration
    API->>DB: Fetch tickets filtered by user role
    API-->>User: 200 OK [Ticket records]
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Endpoint / Operation | HTTP Method | Customer | Agent | Admin | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | Public | Public | Public | Forces `role = CUSTOMER` |
| `/api/auth/login` | `POST` | Public | Public | Public | Verifies bcrypt hash |
| `/api/auth/me` | `GET` | Own Profile | Own Profile | Own Profile | JWT Bearer dependency |
| `/api/tickets/` (List) | `GET` | Own Tickets | All Tickets | All Tickets | Filtered query `created_by == user.id` |
| `/api/tickets/{id}` | `GET` | Own Only | Allowed | Allowed | Returns 404/403 on IDOR attempts |
| `/api/tickets/` (Create)| `POST` | Allowed | Allowed | Allowed | Creator bound to JWT user ID |
| `/api/tickets/{id}` (Update)| `PUT` | Own Only | Allowed | Allowed | Customer restricted from status change |
| `/api/tickets/{id}/status` | `PATCH` | Forbidden | Allowed | Allowed | Requires `ADMIN` or `AGENT` role |
| `/api/tickets/{id}/assign` | `PATCH` | Forbidden | Allowed | Allowed | Requires `ADMIN` or `AGENT` role |
| `/api/tickets/{id}` (Delete)| `DELETE` | Forbidden | Forbidden | Allowed | Requires `ADMIN` role |
| `/api/comments/` (Create)| `POST` | Own Ticket | Any Ticket | Any Ticket | Customer restricted to own ticket |
| `/api/comments/{id}` (Delete)| `DELETE` | Own Only | Own Only | Any Comment | Author or Admin only |
| `/api/users/` (List / CRUD)| `GET/POST`| Forbidden | Forbidden | Allowed | Requires `ADMIN` role |
| `/api/teams/` (CRUD) | `GET/POST`| Forbidden | Forbidden | Allowed | Requires `ADMIN` role |
| `/api/analytics/overview` | `GET` | Allowed | Allowed | Allowed | Real-time SQL count aggregation |
| `/api/analytics/agent-performance` | `GET` | Forbidden | Allowed | Allowed | Requires `ADMIN` or `AGENT` role |
| `/api/ai/*` | `POST` | Own Ticket | Any Ticket | Any Ticket | IDOR validation on ticket_id |

---

## 5. Google Gemini AI Resilient Pipeline

The AI engine processes unstructured ticket data and generates triage insights through a resilient execution pipeline:

```mermaid
flowchart TD
    Trigger["Ticket Event (Create, View, or Refresh AI Copilot)"]
    Service["GeminiService._execute_prompt()"]
    CheckKey{"API Key Configured?"}
    SDKCall["Google GenAI SDK Call\n(Model: gemini-3.5-flash-lite)"]
    InspectErr{"Error Type?"}
    RetryLoop["Exponential Backoff Retry\n(1s, 2s, 4s + Jitter)"]
    ReturnSuccess["Return Structured JSON Result"]
    ReturnError["Return 503 Service Unavailable\n(Clear error message)"]

    Trigger --> Service
    Service --> CheckKey
    CheckKey -- No --> ReturnError
    CheckKey -- Yes --> SDKCall
    SDKCall -- Success --> ReturnSuccess
    SDKCall -- Failure --> InspectErr
    InspectErr -- "503 Demand Spike or 429 Quota" --> RetryLoop
    InspectErr -- "401/403 Invalid Key or Auth" --> ReturnError
    RetryLoop -- Retries remaining --> SDKCall
    RetryLoop -- Retries exhausted --> ReturnError
```

---

## 6. Live SQL Aggregated Analytics Engine

Unlike basic applications that calculate statistics in client-side memory or run multiple unindexed queries, IssueFlow aggregates metrics directly in Supabase PostgreSQL:

```sql
-- Status Distribution & Percentage Calculation (Single Query)
SELECT 
    status, 
    COUNT(id) AS count,
    ROUND((COUNT(id)::numeric / NULLIF((SELECT COUNT(*) FROM tickets), 0)::numeric) * 100, 1) AS percentage
FROM tickets
GROUP BY status;

-- Ticket Trends Grouped by Date (Truncated to Day)
SELECT 
    DATE_TRUNC('day', created_at)::date AS day,
    COUNT(id) AS created_count,
    COUNT(CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 1 END) AS resolved_count
FROM tickets
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day ASC;
```
This ensures sub-millisecond response times even as the ticket database scales to hundreds of thousands of records.

