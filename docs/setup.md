# GhostMitts Setup & Deployment Guide

This document contains detailed setup, database configuration, deployment guides, and asset generation instructions for GhostMitts.

---

## Architecture Overview

GhostMitts consists of:
- **Frontend**: React + Vite application.
- **Backend API**: Cloudflare Worker with LibSQL / Turso database integration (located in `worker/`).
- **Voice Generator**: Python scripts using `edge-tts` to generate strike callouts (located in `voicegen/`).

---

## Database Setup (Turso / LibSQL)

GhostMitts uses [Turso](https://turso.tech/) (built on LibSQL) to persist user accounts, practice streaks, custom preset configurations, and workout history.

### Option A: Remote Turso Cloud Database (Recommended for Production & Cloud Dev)

1. **Install Turso CLI & Log In**:
   ```bash
   # macOS / Linux / WSL
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```

2. **Create Database**:
   ```bash
   turso db create ghostmitts-db
   ```

3. **Retrieve Database URL & Auth Token**:
   ```bash
   # Get Database URL (e.g. libsql://ghostmitts-db-username.turso.io)
   turso db show ghostmitts-db --url

   # Generate Auth Token
   turso db tokens create ghostmitts-db
   ```

4. **Apply Schema**:
   Apply `worker/schema.sql` to provision the required tables (`users`, `sessions`, `presets`, `workouts`):
   ```bash
   # Cross-platform / Unix
   turso db shell ghostmitts-db < worker/schema.sql

   # Windows PowerShell
   Get-Content worker/schema.sql | turso db shell ghostmitts-db
   ```

5. **Configure Worker Environment**:
   - **For local dev (`worker/.dev.vars`)**:
     ```env
     TURSO_DATABASE_URL=libsql://ghostmitts-db-username.turso.io
     TURSO_AUTH_TOKEN=your_generated_turso_auth_token
     SESSION_SECRET=your-secure-random-secret
     ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
     ```
   - **For production deployment (Wrangler Secrets)**:
     ```bash
     npx wrangler secret put TURSO_DATABASE_URL --config worker/wrangler.toml
     npx wrangler secret put TURSO_AUTH_TOKEN --config worker/wrangler.toml
     npx wrangler secret put SESSION_SECRET --config worker/wrangler.toml
     ```

### Option B: Embedded Local SQLite File (Offline Local Dev)

If developing offline without a remote Turso database:

1. Configure `worker/.dev.vars`:
   ```env
   TURSO_DATABASE_URL=file:local.db
   TURSO_AUTH_TOKEN=local
   SESSION_SECRET=local-session-secret-key-12345
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

2. Initialize `local.db` from `worker/schema.sql`:
   - **macOS / Linux / Git Bash**:
     ```bash
     sqlite3 local.db < worker/schema.sql
     ```
   - **Windows PowerShell**:
     ```powershell
     Get-Content worker/schema.sql | sqlite3 local.db
     ```

3. Start the worker dev server:
   ```bash
   npm run api:dev
   ```

---

## Deploying Cloudflare Worker API

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

2. **Deploy**:
   ```bash
   npm run api:deploy
   ```

3. **Verify deployment**:
   ```bash
   curl https://YOUR_WORKER_SUBDOMAIN.workers.dev/health
   ```

4. **Tail logs during testing**:
   ```bash
   npm run api:tail
   ```

### Troubleshooting: "Accounts Offline" in Frontend

The frontend communicates with the API via `VITE_API_BASE` (or `BUN_PUBLIC_API_BASE`) injected at build time.

- In your Vercel/hosting dashboard under Project Settings -> Environment Variables, configure:
  - `VITE_API_BASE=https://YOUR_WORKER_SUBDOMAIN.workers.dev`
  - (Optional) `BUN_PUBLIC_API_BASE=https://YOUR_WORKER_SUBDOMAIN.workers.dev`
  - Apply to Production and Preview deployments.
- Ensure the API Worker allows frontend origin(s) by configuring `ALLOWED_ORIGINS` in `worker/wrangler.toml` or `worker/.dev.vars`:
  ```toml
  ALLOWED_ORIGINS = "https://yourdomain.com,https://your-project.vercel.app,http://localhost:3000"
  ```
- Redeploy both the API Worker and frontend.

### Custom Domain Setup

Uncomment and configure the `routes` section in `worker/wrangler.toml` to map `api.<your-domain>` to the Cloudflare Worker. Add your frontend domain(s) to `ALLOWED_ORIGINS`.

---

## Voice Generation

To generate or modify the audio strike callouts:

1. Navigate to the voice generation directory:
   ```bash
   cd voicegen
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run audio generator:
   ```bash
   python gen.py
   ```
