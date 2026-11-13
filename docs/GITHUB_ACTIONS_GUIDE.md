# IssueFlow – GitHub Actions CI/CD Pipeline Guide

This document describes the automated Continuous Integration (CI) pipeline configured for IssueFlow via GitHub Actions (`.github/workflows/ci.yml`).

---

## 1. Pipeline Purpose & Philosophy

The IssueFlow CI workflow ensures that **every pull request and push to the main branch is automatically tested and verified** before deployment.

### Key Principles:
1. **Zero Secret Leakage**: The CI pipeline does not require production credentials. Tests use isolated, lightweight SQLite test fixtures or mocked services.
2. **Fail Fast**: If any backend Pytest fails, frontend Vitest fails, or TypeScript build generates a type error, the workflow halts immediately and marks the commit with a red cross (X).
3. **Reproducibility**: Runs on clean `ubuntu-latest` runners with pinned dependencies (`pip install -r backend/requirements.txt` and `npm ci`).

---

## 2. Workflow Trigger Events

The workflow triggers on:
- `push` to `main` or `master` branch.
- `pull_request` targeting `main` or `master` branch.

```yaml
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
```

It includes a concurrency guard:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
This cancels stale, superseded CI runs when a developer pushes new commits to the same PR, conserving runner minutes.

---

## 3. Pipeline Architecture

The workflow consists of two independent, parallel jobs:

```
[ Git Push / PR ]
       |
       +-----------------------+
       |                       |
       v                       v
[ backend-ci ]          [ frontend-ci ]
- Python 3.12 Setup     - Node.js 20 Setup
- Pip Cache Check       - NPM Cache Check
- Install requirements  - npm ci
- Pytest Suite          - Vitest Unit Tests
  (82 tests)              (16 tests)
                        - tsc -b (Type check)
                        - npm run build (Vite bundle)
```

---

## 4. Job Details

### Job 1: `backend-ci` (Backend Tests & Validation)
1. **Runner**: `ubuntu-latest`
2. **Python Version**: `3.12`
3. **Pip Caching**: Caches `~/.cache/pip` based on `backend/requirements.txt` hash.
4. **Environment Variables**:
   ```yaml
   ENVIRONMENT: test
   DATABASE_URL: sqlite:///./ci_test.db
   SECRET_KEY: ci-test-secret-key-never-use-in-production-1234567890
   ACCESS_TOKEN_EXPIRE_MINUTES: 30
   INITIAL_ADMIN_EMAIL: admin@issueflow.com
   INITIAL_ADMIN_PASSWORD: Admin@123
   GEMINI_API_KEY: mock_ci_gemini_key_for_testing
   GEMINI_MODEL: gemini-3.5-flash-lite
   ```
5. **Execution**:
   ```bash
   pytest backend/tests -v
   ```
   Verifies:
   - Auth endpoints (register, login, JWT token generation, role verification).
   - User CRUD & role-based access control.
   - Ticket lifecycle (creation, status transition, priority, assignment).
   - Comments & team management.
   - SQL analytics aggregation endpoints.
   - Google Gemini AI client error handling and retry mechanism.

---

### Job 2: `frontend-ci` (Frontend Tests & Build)
1. **Runner**: `ubuntu-latest`
2. **Node.js Version**: `20`
3. **NPM Caching**: Caches `~/.npm` based on `package-lock.json` hash.
4. **Clean Install**:
   ```bash
   npm ci
   ```
5. **Vitest Unit Tests**:
   ```bash
   npm run test
   ```
   Tests React UI components, login forms, navigation bars, and utility mappers.
6. **TypeScript Validation**:
   ```bash
   npx tsc -b
   ```
   Ensures complete type safety and catches missing properties across the codebase.
7. **Production Build**:
   ```bash
   npm run build
   ```
   Builds the optimized Vite production bundle in `dist/`.

---

## 5. How to View CI Results on GitHub

1. Push your changes to your GitHub branch or open a Pull Request.
2. Navigate to your repository on [GitHub.com](https://github.com).
3. Click on the **Actions** tab at the top.
4. Click on the latest workflow run named **IssueFlow CI Pipeline**.
5. You can view the real-time logs for both `backend-ci` and `frontend-ci`.
6. Successful runs display a green checkmark (**Passed**). Failed runs provide line-by-line traceback errors to diagnose.

---

## 6. Local Pre-Commit Checks

To ensure your code passes CI before pushing to GitHub, run these three checks locally:

```powershell
# 1. Run backend tests
cd backend
.\.venv\Scripts\pytest tests/ -v
cd ..

# 2. Run frontend tests
npm run test

# 3. Verify TypeScript and frontend production build
npm run build
```
If all three pass locally, your GitHub Actions CI pipeline will pass with 100% certainty.

