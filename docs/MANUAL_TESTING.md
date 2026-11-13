# IssueFlow – Manual End-to-End Testing Guide

This guide provides end-to-end testing scenarios to verify IssueFlow full-stack operations across **Admin**, **Agent**, and **Customer** roles.

---

## Prerequisites: Starting the Application

### 1. Start FastAPI Backend
Open Terminal 1 in the project root:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
- Swagger UI will be available at: `http://localhost:8000/docs`

### 2. Start React Frontend
Open Terminal 2 in the project root:
```powershell
npm run dev
```
- Application will be available at: `http://localhost:5173`

---

## Scenario 1: Customer Self-Registration & Ticket Submission

1. Open `http://localhost:5173/register` in an incognito window.
2. Fill in:
   - **Full Name**: `Jonathan Sterling`
   - **Work Email**: `j.sterling@cloudscale.io`
   - **Password**: `Password123`
   - **Confirm Password**: `Password123`
3. Click **"Create Account"**.
   - *Verification*: You are redirected to `/dashboard`. Notice that internal menu items (such as the Team roster) are hidden or restricted.
4. Navigate to **New Ticket** (`/tickets/create`).
5. Enter:
   - **Title**: `Production cluster database timeout`
   - **Category**: `Technical Issue`
   - **Priority**: `High`
   - **Description**: `Our backend services cannot reach the database cluster since 14:00 UTC.`
6. Click **"Submit Ticket"**.
   - *Verification*: Ticket is filed in Supabase PostgreSQL and appears under **My Tickets** (`/my-tickets`).

---

## Scenario 2: Support Agent Triage & Discussion

1. Log out and navigate to `/login`.
2. Enter Demo Admin / Staff credentials:
   - **Email**: `admin@issueflow.com`
   - **Password**: `Admin@123`
3. Click **"Sign In"**.
4. Navigate to **All Tickets** (`/tickets`).
5. Open the newly filed ticket (`Production cluster database timeout`).
6. Update status to **"In Progress"** using the status dropdown.
7. In the discussion box, type:
   - `Investigating the connection pool now. Please stand by.`
8. Click **"Send Reply"**.
   - *Verification*: The comment appears immediately with timestamp and author name.

---

## Scenario 3: Analytics Dashboard & Filters

1. Navigate to **Analytics** (`/analytics`).
2. Verify the 4 KPI cards:
   - **Total Tickets Processed** matches live database count.
   - **Resolution Rate %** matches resolved/closed ratio.
   - **Active Workload** reflects open + in-progress counts.
3. Toggle date filter pills:
   - Click **Today**, **7 Days**, **30 Days**, **Quarter**.
   - Select **Custom**, pick a start date and end date, and click **Apply Filter**.
4. Click **"Export CSV"**:
   - *Verification*: Browser downloads an `IssueFlow_Analytics_...csv` file containing the calculated metrics.

