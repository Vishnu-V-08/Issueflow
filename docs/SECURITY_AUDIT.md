# IssueFlow – Application Security Audit Report

**Audit Date**: November 13, 2026  
**Auditor**: Senior Application Security Engineer & QA Lead  
**Scope**: FastAPI Backend, Supabase PostgreSQL DB, React Frontend, Authentication, Authorization, and Gemini AI.

---

## 1. Executive Summary

A comprehensive application security audit was conducted on **IssueFlow**. All authentication mechanisms, role-based access control (RBAC), database queries, and input validation vectors were inspected and verified with automated test suites.

| Security Control | Implementation | Audit Result |
| :--- | :--- | :--- |
| **Password Storage** | `bcrypt.hashpw` with per-user salt generation | **PASSED** |
| **JWT Signature & Expiry** | HS256 HMAC-SHA256 with 30-minute expiration enforcement | **PASSED** |
| **Privilege Escalation** | Registration hardcoded to role `CUSTOMER` | **PASSED** |
| **IDOR Prevention** | Server-side ownership verification (`Ticket.created_by == user.id`) | **PASSED** |
| **Agent Assignment Guard** | Restricted to `ADMIN` and `AGENT` via `require_staff` | **PASSED** |
| **Arbitrary Status Changes** | Customers restricted to `OPEN` or `CLOSED` on own tickets | **PASSED** |
| **SQL Injection** | 100% SQLAlchemy ORM parameterized queries | **PASSED** |
| **Data Leakage in Responses** | `UserResponse` strips `hashed_password` and sensitive fields | **PASSED** |
| **CORS Policy** | Whitelisted specific origins (no wildcard `*` with credentials) | **PASSED** |
| **API Secret Protection** | Secrets confined to untracked `.env` files; zero leaks | **PASSED** |

---

## 2. In-Depth Audit Findings

### 2.1 Password Hashing & Authentication
- Plain-text passwords are never persisted. Passwords are processed via `bcrypt` with unique salts.
- Login returns signed JWT access tokens containing user ID, role, and expiration timestamps.
- Tokens without signatures, with invalid signatures, or past expiration are rejected with `401 Unauthorized`.

### 2.2 Customer Isolation & IDOR Protection
- **Viewing Tickets**: Customers calling `GET /api/tickets/{id}` for tickets they did not file receive `403 Forbidden`.
- **Modifying Tickets**: Customers calling `PUT /api/tickets/{id}` for other tickets receive `403 Forbidden`. Even on their own tickets, status and agent assignment fields are stripped and ignored.
- **Commenting**: Customers cannot post or read comments on another customer's ticket (`403 Forbidden`).
- **Ticket Deletion**: Restricted exclusively to `ADMIN`. Even `AGENT` cannot delete tickets (`403 Forbidden`).

### 2.3 SQL Injection Resistance
- Tested with classic injection payloads (`'; DROP TABLE tickets; --`).
- SQLAlchemy ORM parameterizes all search terms, queries, and filters. No SQL statement concatenation is performed anywhere in the codebase.

### 2.4 CORS Configuration
- In `backend/app/main.py`, CORS middleware uses `allow_origins=settings.CORS_ORIGINS`.
- Whitelisted URLs: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`.
- Protects against cross-origin attacks from malicious web origins.

### 2.5 Secret Key & Credential Safety
- `.gitignore` explicitly excludes:
  - `.env`
  - `.env*.local`
  - `backend/.env`
  - `backend/.env.local`
- Neither `DATABASE_URL` nor `GEMINI_API_KEY` are exposed in frontend bundles, git history, or API error responses.

