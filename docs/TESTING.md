# IssueFlow – Comprehensive Testing Documentation

This document describes the automated testing framework, test suites, execution commands, and coverage for **IssueFlow** (Frontend + Backend + Supabase PostgreSQL).

---

## 1. Test Architecture Overview

```
IssueFlow Test Suite
├── Backend (Pytest) - 77 Tests (100% Passing)
│   ├── test_auth.py (16 tests)           - Registration, Login, JWT tokens, Password Hashing, RBAC
│   ├── test_tickets.py (7 tests)         - Ticket CRUD, Status Updates, Agent Assignment
│   ├── test_comments.py (3 tests)        - Threaded Discussion & Comment Deletion
│   ├── test_teams.py (5 tests)           - Team / Department Management
│   ├── test_users.py (7 tests)           - User Directory & Admin Management
│   ├── test_analytics.py (10 tests)      - SQL Aggregations, Date Filters, Role Isolation
│   ├── test_ai.py (14 tests)             - Gemini Classification, Priority, Fallbacks, Quotas
│   ├── test_security_audit.py (13 tests) - RBAC Enforcement, IDOR Prevention, SQLi Defense
│   └── test_health.py (2 tests)          - Supabase Connection & Health Diagnostics
│
└── Frontend (Vitest) - 16 Tests (100% Passing)
    ├── mappers.test.ts (5 tests)         - Bidirectional Enum & Data Transforming
    ├── auth.test.tsx (3 tests)           - Login & Registration Form Validation
    ├── tickets.test.tsx (2 tests)        - Status & Severity Badges
    ├── analytics.test.tsx (3 tests)      - Analytics Service API Integration
    └── ai.test.tsx (3 tests)             - AI Auto-Triage & Resolution Calling
```

---

## 2. How to Run the Automated Test Suites

### Backend Pytest Suite
From the repository root:
```powershell
& "backend\.venv\Scripts\python.exe" -m pytest backend/tests -v
```

**Latest Pytest Results**:
- **77 passed** in 34.51s
- **0 failures, 0 errors**

### Frontend Vitest Suite
From the repository root:
```powershell
npm run test
```

**Latest Vitest Results**:
- **16 passed** in 1.55s
- **5 test files passed**
- **0 failures, 0 errors**

### Frontend Production Build Verification
```powershell
npm run build
```
- Bundles 2,654 TypeScript modules with Vite.
- Output: `dist/index.html`, `dist/assets/index.css`, `dist/assets/index.js`.
- **0 TypeScript compilation errors**.

---

## 3. Integration Testing Matrix

| Component Flow | Test Method | Status | Notes |
| :--- | :--- | :--- | :--- |
| **FastAPI ↔ Supabase PostgreSQL** | `check_db_connection()` & migration checks | **VERIFIED** | PostgreSQL 17.11 connected, transactions verified. |
| **FastAPI ↔ Gemini AI** | `GeminiService` live diagnostic & mocks | **PROTECTED** | 503 high-demand spike handled gracefully with zero token/credential exposure. |
| **React ↔ FastAPI Auth** | JWT bearer injection & 401 interception | **VERIFIED** | Session restores from `localStorage` on reload. |
| **React ↔ FastAPI Tickets** | CRUD operations & live comments | **VERIFIED** | Customer ticket isolation enforced. |
| **React ↔ FastAPI Analytics** | Date-filtered SQL aggregations | **VERIFIED** | Real-time charts rendered with Recharts. |

