# GhostMitts

<img src="src/assets/logo.svg" alt="Logo" width="200" height="200">

Imagine coach telling you what combinations to throw, anywhere, anytime.

## Running Locally

### Front end

Install dependencies:

```bash
npm install
```

To start a development server (recommended):

```bash
npm run dev
```

Or build first:

```bash
npm run build
```

Then preview production build:

```bash
npm run preview
```

This project uses standard npm scripts for local dev and builds.

## API (Cloudflare Worker)

The backend API lives in [worker/src/index.ts](worker/src/index.ts) and persists accounts, presets, and workouts.

### Local dev

1. Install dependencies (repo root):

```bash
npm install
```

1. Create a local Wrangler vars file:

```bash
copy worker\.dev.vars.example worker\.dev.vars
```

### Database Setup (Turso / LibSQL)

GhostMitts uses [Turso](https://turso.tech/) (built on LibSQL) to persist user accounts, practice streaks, custom preset configurations, and workout history.

#### Option A: Remote Turso Cloud Database (Recommended for Production & Cloud Dev)

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
   # Using Turso CLI (cross-platform)
   turso db shell ghostmitts-db < worker/schema.sql

   # Windows PowerShell alternative
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

#### Option B: Embedded Local SQLite File (Offline Local Dev)

If developing without a remote Turso database:

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

### Deploying the Cloudflare Worker API

1. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```

2. Deploy:
   ```bash
   npm run api:deploy
   ```

3. Verify deployment:
   ```bash
   curl https://YOUR_WORKER_SUBDOMAIN.workers.dev/health
   ```

#### If the Vercel frontend says "Accounts Offline"

The frontend talks to the API using `VITE_API_BASE` (or `BUN_PUBLIC_API_BASE`) **at build time**.

- In the Vercel Project, go to Settings -> Environment Variables, set:

  - `VITE_API_BASE=https://YOUR_WORKER_SUBDOMAIN.workers.dev`
  - (Optional) `BUN_PUBLIC_API_BASE=https://YOUR_WORKER_SUBDOMAIN.workers.dev`
  - Apply to Production (and Preview if you use preview deploys)
- Redeploy the frontend.

Also ensure the API Worker allows your frontend origin(s):

- In [worker/wrangler.toml](worker/wrangler.toml) set `ALLOWED_ORIGINS` to a comma-separated list of exact origins, e.g.

  - `https://yourdomain.com,https://your-project.vercel.app,http://localhost:3000`
- Redeploy the API Worker.

To watch logs while you test:

```bash
npm run api:tail
```

### Custom domain (recommended)

Uncomment and fill in the `routes` snippet in [worker/wrangler.toml](worker/wrangler.toml) to map `api.<your-domain>` to the Worker.
Then add your frontend origin(s) to `ALLOWED_ORIGINS`.

### Voice Generation

If you want to generate the audio files yourself:

```bash
cd voicegen
python gen.py
```

Make sure to install the edge-tts and other libraries (run `pip install -r requirements.txt`) before running the Python script.
