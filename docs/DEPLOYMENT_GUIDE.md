# IssueFlow – Production Deployment Guide

This guide provides beginner-friendly, step-by-step instructions for deploying IssueFlow to production using free-tier / popular cloud platforms:
- **Database**: Supabase PostgreSQL (Managed Cloud Database)
- **Backend**: Render Web Service (FastAPI + Docker or Python runtime)
- **Frontend**: Vercel (or Netlify) Static SPA Hosting

---

## 1. Architecture & Flow

```
[ User Browser ]
       |
       |  1. Requests Web UI
       v
[ Vercel CDN ]  (Frontend: https://issueflow.vercel.app)
       |
       |  2. API Calls with JWT (Bearer Token)
       v
[ Render Web Service ]  (Backend: https://issueflow-api.onrender.com)
       |
       +-------------------------------+-------------------------------+
       |                                                               |
       v                                                               v
[ Supabase PostgreSQL ]                                       [ Google Gemini API ]
(Persistent Cloud Database)                                   (AI Priority & Solutions)
```

---

## 2. Step 1: Prepare Supabase PostgreSQL (Already Configured)

Supabase PostgreSQL serves as your primary production database.

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your IssueFlow project.
3. Go to **Project Settings** -> **Database**.
4. Scroll to **Connection string** and select **URI**.
5. Choose **Session Pooler** (Port `5432` with IPv4 support).
6. Note down your connection URI:
   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@[POOLER-HOST]:5432/postgres
   ```
> [!WARNING]
> Keep your database password secure. Never share or commit this connection string to public repositories.

---

## 3. Step 2: Deploy Backend to Render (Free Web Service)

Render provides free hosting for web services running Docker or Python.

### Option A: Using the Render Blueprint (`render.yaml`)
1. Create a free account at [render.com](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository (`issueflow`).
4. Render will automatically detect `render.yaml` and configure the service.
5. In the Render Dashboard, fill in the secret environment variables marked `sync: false`:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
   - `INITIAL_ADMIN_EMAIL`: Your production admin email (e.g. `admin@yourcompany.com`).
   - `INITIAL_ADMIN_PASSWORD`: A strong random password (minimum 12 characters, never `Admin@123`).
   - `GEMINI_API_KEY`: Your Google Gemini API key from AI Studio.
   - `CORS_ORIGINS`: Temporary value `http://localhost:5173` (we will update this once frontend is deployed).
6. Click **Apply**.
7. Render will build the container using `backend/Dockerfile` and deploy the service.
8. Once live, Render assigns a public URL, for example:
   `https://issueflow-backend.onrender.com`
9. Test the health endpoint in your browser:
   `https://issueflow-backend.onrender.com/api/health`

---

## 4. Step 3: Deploy Frontend to Vercel (Free Hobby Tier)

Vercel provides edge hosting with automatic global CDN and SSL for React applications.

1. Create a free account at [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`issueflow`).
4. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables**:
   - Add:
     - **Name**: `VITE_API_BASE_URL`
     - **Value**: Your live Render backend URL:
       `https://issueflow-backend.onrender.com` (no trailing slash)
6. Click **Deploy**.
7. Vercel will build and deploy the React application in under 60 seconds.
8. Vercel assigns a public production URL, for example:
   `https://issueflow-production.vercel.app`

---

## 5. Step 4: Connect Backend CORS to Frontend Domain

Now that your frontend has a live production URL, allow it in your backend's CORS configuration:

1. Return to the **Render Dashboard**.
2. Select your `issueflow-backend` service.
3. Go to **Environment** variables.
4. Update `CORS_ORIGINS`:
   ```text
   https://issueflow-production.vercel.app
   ```
   *(If you also test locally, use comma-separated URLs: `https://issueflow-production.vercel.app,http://localhost:5173`)*
5. Click **Save Changes**. Render will automatically redeploy the backend with the new allowed origin.

---

## 6. Step 5: Post-Deployment Smoke Test

Visit your live Vercel URL in your browser:
1. **Login Test**:
   - Log in using your `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.
   - Verify you land on the Dashboard with your admin profile loaded.
2. **Ticket Creation Test**:
   - Create a new ticket:
     - Title: "Production Smoke Test"
     - Description: "Verifying live Supabase database and frontend connectivity."
   - Click **Save**. Verify the ticket appears in the ticket list immediately.
3. **Gemini AI Test**:
   - Open the newly created ticket.
   - Click **Suggest Priority** or **Suggest Solution**.
   - Verify the AI response generates correctly within 2–5 seconds.
4. **Analytics Test**:
   - Click on the **Analytics** tab in navigation.
   - Verify charts and statistics load real SQL aggregation numbers.

---

## 7. Alternative Hosting Options

### Alternative Frontend: Netlify
1. Log into [netlify.com](https://netlify.com).
2. Click **Add new site** -> **Import an existing project**.
3. Select your GitHub repository.
4. Netlify detects `netlify.toml` automatically.
5. In **Build & deployment environment variables**, add `VITE_API_BASE_URL` pointing to your backend URL.
6. Click **Deploy site**.

### Alternative Backend: Railway
1. Log into [railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select `backend/Dockerfile` or allow Railway to use `Procfile`.
4. Add the required environment variables in the **Variables** tab.
5. Generate a public domain under **Settings** -> **Networking**.

