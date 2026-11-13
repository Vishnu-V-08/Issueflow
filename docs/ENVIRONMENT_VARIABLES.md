# IssueFlow – Environment Variables Reference Guide

This document lists all environment variables used by IssueFlow across the Backend, Frontend, and Docker environments.

---

## 1. Quick Reference Table

| Variable Name | Component | Scope / Environment | Required in Prod? | Default Value (Dev) | Description |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Backend | Backend / Docker | **YES** | *(empty)* | Supabase PostgreSQL connection URI with credentials and session pooler port (5432). |
| `SECRET_KEY` | Backend | Backend / Docker | **YES** | `issueflow-dev-secret...` | 32+ byte cryptographic secret for signing JWT HS256 tokens. |
| `ENVIRONMENT` | Backend | Backend / Docker | Recommended | `development` | Runtime environment mode (`development`, `production`, `test`). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | Backend / Docker | Optional | `30` | JWT access token lifespan in minutes. |
| `INITIAL_ADMIN_EMAIL` | Backend | Backend / Docker | **YES** | `admin@issueflow.com` | Email address for initial admin account seeding. |
| `INITIAL_ADMIN_PASSWORD` | Backend | Backend / Docker | **YES** | `Admin@123` | Initial password. In production, must NOT be `Admin@123` and >= 10 chars. |
| `INITIAL_ADMIN_NAME` | Backend | Backend / Docker | Optional | `Sarah Jenkins` | Full name of the initial administrator. |
| `GEMINI_API_KEY` | Backend | Backend / Docker | **YES** | *(empty)* | Google Gemini AI API key from Google AI Studio. |
| `GEMINI_MODEL` | Backend | Backend / Docker | Optional | `gemini-3.5-flash-lite` | Model ID for AI priority assessment and auto-replies. |
| `CORS_ORIGINS` | Backend | Backend / Docker | **YES** | `http://localhost:5173,...` | Comma-separated list of allowed frontend URLs. |
| `PROJECT_NAME` | Backend | Backend / Docker | Optional | `IssueFlow` | Application display name for Swagger and logs. |
| `VERSION` | Backend | Backend / Docker | Optional | `1.0.0` | API semantic version string. |
| `API_V1_STR` | Backend | Backend / Docker | Optional | `/api` | Base route prefix for all API endpoints. |
| `VITE_API_BASE_URL` | Frontend | Frontend / Docker | **YES** | `http://localhost:8000` | Base URL used by Axios/Fetch client to make requests to FastAPI. |

---

## 2. Detailed Variable Descriptions

### `DATABASE_URL`
- **Location**: `backend/.env` or Docker Compose `.env` or Render environment settings.
- **Example**:
  ```text
  postgresql://postgres.ymsjcqvoftwfgfregvpm:YourPassword@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
  ```
- **Security**: Must contain your private Supabase database password. Never commit this to Git or expose in client-side code.

### `SECRET_KEY`
- **Location**: `backend/.env` or Docker Compose `.env` or Render environment settings.
- **Example**:
  ```text
  SECRET_KEY=9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e
  ```
- **How to generate**:
  Run in terminal:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```
- **Security**: Used by PyJWT to digitally sign access tokens. If compromised, an attacker could forge tokens.

### `ENVIRONMENT`
- **Options**: `development`, `production`, `test`
- **Behavior**:
  - `development`: Allows default admin password `Admin@123` for quick local testing.
  - `production`: Safeguard actively blocks default `Admin@123` password and logs a CRITICAL alert if an insecure password is provided.
  - `test`: Used during Pytest execution.

### `INITIAL_ADMIN_EMAIL` & `INITIAL_ADMIN_PASSWORD`
- **Purpose**: Creates the first system administrator upon the first startup if no ADMIN user exists.
- **Production Requirement**: In production, supply a strong password (minimum 12 characters with letters, numbers, and symbols).

### `GEMINI_API_KEY`
- **Purpose**: Authenticates with Google GenAI API for automated ticket priority prediction and suggested customer responses.
- **Where to obtain**: [Google AI Studio](https://aistudio.google.com/).
- **Model**: Default is `gemini-3.5-flash-lite`.

### `CORS_ORIGINS`
- **Purpose**: Controls Cross-Origin Resource Sharing. Specifies which frontend origins are permitted by the browser to call the API.
- **Format**: Comma-separated list of origins (no spaces around commas).
- **Example**:
  ```text
  CORS_ORIGINS=https://issueflow.vercel.app,http://localhost:5173
  ```

### `VITE_API_BASE_URL` (Frontend)
- **Location**: `.env` (development) or Vercel/Netlify Environment Variables (production).
- **Format**: Full URL to backend without a trailing slash.
- **Example**:
  ```text
  VITE_API_BASE_URL=https://issueflow-backend.onrender.com
  ```
- **Note**: This value is embedded into static JavaScript files during `npm run build`. When updating this variable on Vercel or Netlify, you must trigger a redeployment.

