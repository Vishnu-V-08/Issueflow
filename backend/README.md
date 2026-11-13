# IssueFlow Backend API (FastAPI + Supabase PostgreSQL + JWT RBAC + Google Gemini AI)

High-performance, asynchronous REST API for the **IssueFlow AI-Powered Support & Issue Management Platform**, architected with **FastAPI**, **SQLAlchemy ORM**, **Alembic**, **Pydantic v2**, **Supabase PostgreSQL**, **Custom JWT RBAC**, and **Google Gemini AI**.

---

## 🏗️ Architecture & Folder Structure

```
backend/
├── alembic/                     # Database schema migrations
│   ├── env.py                  # Alembic environment configured with SQLAlchemy Base
│   ├── script.py.mako          # Migration template
│   └── versions/               # Versioned migration scripts
│       └── d45c055eb880_initial_schema_migration_for_issueflow.py
├── alembic.ini                  # Alembic configuration
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI initialization, CORS, and lifecycle handler
│   ├── core/
│   │   ├── config.py            # Pydantic Settings reading .env (Gemini, JWT, DB, CORS)
│   │   └── security.py          # Secure bcrypt password hashing, JWT encoding/decoding
│   ├── database/
│   │   ├── __init__.py
│   │   └── connection.py        # SQLAlchemy engine, SessionLocal, SSL, and get_db dependency
│   ├── models/                  # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py              # User model (ADMIN, AGENT, CUSTOMER)
│   │   ├── ticket.py            # Ticket model (Category, Priority, Status, Creator, Assignee)
│   │   ├── comment.py           # Comment model (Author, Ticket relation)
│   │   ├── team.py              # Support team / department model
│   │   └── ticket_history.py    # Audit history for ticket status transitions
│   ├── schemas/                 # Pydantic request/response validation schemas
│   │   ├── __init__.py
│   │   ├── ai.py                # AIClassification, AIPriority, AISummary, AIResolution, AISentiment
│   │   ├── auth.py              # RegisterRequest, LoginRequest, Token, PasswordChange
│   │   ├── user.py              # UserCreate, UserUpdate, UserResponse (passwords excluded)
│   │   ├── ticket.py            # TicketCreate, TicketUpdate, TicketResponse, TicketListResponse
│   │   ├── comment.py           # CommentCreate, CommentResponse
│   │   └── team.py              # TeamCreate, TeamUpdate, TeamResponse
│   ├── api/                     # Modular API route controllers
│   │   ├── __init__.py          # Combined api_router
│   │   ├── deps.py              # FastAPI dependencies (JWT extractors, role checkers)
│   │   ├── ai.py                # AI endpoints (/classify, /priority, /summarize, /suggest-resolution, /sentiment)
│   │   ├── auth.py              # Registration, Login, Swagger token, Profile, Password changes
│   │   ├── health.py            # GET /api/health (with live DB connectivity probe)
│   │   ├── users.py             # Admin-only CRUD endpoints for /api/users
│   │   ├── tickets.py           # Scoped ticket CRUD, search, status, assignment & comments
│   │   ├── comments.py          # DELETE /api/comments/{id} (Author or Admin only)
│   │   └── teams.py             # CRUD endpoints for /api/teams (Admin manage, Auth view)
│   └── services/                # Business logic separation layer
│       ├── __init__.py
│       ├── gemini_service.py    # Google Gemini AI integration, prompts & error recovery
│       ├── auth_service.py      # Registration, verification, token generation
│       ├── user_service.py      # User logic, password hashing, unique email enforcement
│       ├── ticket_service.py    # Ticket sequence generation, audit logging, role filtering
│       ├── comment_service.py   # Comment validation & persistence
│       └── team_service.py      # Team operations
├── tests/                       # Pytest automated test suite (54 passing tests)
│   ├── __init__.py
│   ├── conftest.py              # In-memory test database fixture & auth headers fixtures
│   ├── test_ai.py               # 15 tests covering all AI capabilities, errors & mock fallbacks
│   ├── test_auth.py             # 15 tests covering full JWT & RBAC permission matrix
│   ├── test_health.py           # Root & health check tests
│   ├── test_users.py            # User creation, duplicate prevention, updates, and deletes
│   ├── test_tickets.py          # Ticket creation, filtering, assignment, status history
│   ├── test_comments.py        # Comment creation, retrieval, and deletion
│   └── test_teams.py            # Team management tests
├── .env.example                 # Configuration template with Supabase, JWT & Gemini settings
├── .env                         # Local environment settings (git-ignored)
├── requirements.txt             # Locked dependencies
├── test_connection.py           # Diagnostic script to test live Supabase connectivity
└── README.md
```

---

## 🤖 Google Gemini AI Integration (Phase 5)

IssueFlow utilizes Google's official unified **`google-genai`** SDK to provide five automated AI intelligence features:

### 1. The 5 AI Capabilities

| Feature | Endpoint | Description |
|---|---|---|
| **Ticket Classification** | `POST /api/ai/classify` | Analyzes title & description to predict category (`TECHNICAL_ISSUE`, `BILLING`, `ACCOUNT`, `BUG_REPORT`, `FEATURE_REQUEST`, `GENERAL_INQUIRY`) with confidence score. |
| **Priority Detection** | `POST /api/ai/priority` | Assesses incident severity & urgency factors to suggest priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). Does not override manual user selection. |
| **Ticket Summarization** | `POST /api/ai/summarize` | Condenses complex descriptions or conversation threads into concise executive summaries and key bullet points. |
| **Resolution Suggestions** | `POST /api/ai/suggest-resolution` | Hypothesizes root cause and step-by-step troubleshooting actions. Explicitly labeled as AI-generated guidance. |
| **Sentiment Analysis** | `POST /api/ai/sentiment` | Identifies customer emotional state (`POSITIVE`, `NEUTRAL`, `NEGATIVE`, `FRUSTRATED`) with polarity score (-1.0 to 1.0). |

---

## 🔑 How to Obtain a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click the **Get API key** button in the top left navigation.
4. Click **Create API key** (select an existing Google Cloud project or create a free project).
5. Copy the generated API key (it begins with `AIzaSy...`).

---

## ⚙️ Configuring `backend/.env`

Open `backend/.env` and add your key:

```env
# Google Gemini AI Configuration
GEMINI_API_KEY=AIzaSyYourActualKeyHere
GEMINI_MODEL=gemini-2.5-flash
```

> [!IMPORTANT]
> - Never commit `backend/.env` to GitHub. The file is already listed in `.gitignore`.
> - If `GEMINI_API_KEY` is not set or left empty, all core ticket and authentication APIs continue working normally, while AI endpoints gracefully return `503 Service Unavailable` explaining that the key must be configured.

---

## 🚦 Known Free-Tier Limitations

Google AI Studio provides a generous free tier for `gemini-2.5-flash`:
- **Rate Limit**: 15 Requests Per Minute (RPM)
- **Daily Quota**: 1,500 Requests Per Day (RPD)
- **Token Quota**: 1,000,000 Tokens Per Minute (TPM)

The backend handles rate limits gracefully: if the quota is reached, it returns HTTP `429 Too Many Requests` instead of crashing.

---

## 🧪 Testing AI Endpoints via Swagger UI

1. Start the FastAPI server:
   ```powershell
   & "backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload
   ```
2. Open your browser to [http://localhost:8000/docs](http://localhost:8000/docs).
3. Click **Authorize 🔓** and sign in with default admin credentials:
   - **Username**: `admin@issueflow.com`
   - **Password**: `Admin@123`
4. Expand the **AI Assistance (Gemini)** section.
5. Click on `POST /api/ai/classify`, click **Try it out**, enter:
   ```json
   {
     "title": "Double billing on subscription renewal",
     "description": "My credit card was charged twice for $49 on invoice INV-2026."
   }
   ```
6. Click **Execute** and review the structured AI response!

---

## 🧪 Running Pytest Automated Tests

All tests mock external AI calls to guarantee that tests never consume your Gemini API quota:

```powershell
& "backend\.venv\Scripts\python.exe" -m pytest backend/tests -v
```

**Test Breakdown (54 passing tests)**:
- `test_ai.py` (15 tests): Classification, priority detection, summaries, resolution suggestions, sentiment analysis, auth verification, customer isolation, empty input validation, quota exceeded (429), invalid key (502), timeout (504), and malformed response (502).
- `test_auth.py` (15 tests): Registration, bcrypt hashing, JWT issuance, RBAC permissions, customer isolation.
- `test_tickets.py` (8 tests): Ticket lifecycle, sequence IDs, status history, agent assignments.
- `test_users.py` (7 tests): Admin user management, duplicate prevention.
- `test_teams.py` (5 tests): Team and department CRUD.
- `test_comments.py` (3 tests): Comment authoring and permissions.
- `test_health.py` (2 tests): Health checks and Supabase connectivity probes.
