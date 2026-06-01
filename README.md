# GhostMitts

A little coach to tell you what combinations to throw.

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

#### Running with a Local SQLite/LibSQL File (No Turso Required)

If you don't want to set up a remote Turso database for local development, you can run the API against a local SQLite file using LibSQL's embedded database feature.

1. Open `worker/.dev.vars` and configure the following variables:
   
   ```env
   # Tell the worker to write/read to a local SQLite database file
   TURSO_DATABASE_URL=file:local.db
   # Set a placeholder token (non-empty string required by index.ts)
   TURSO_AUTH_TOKEN=local
   # Set a mock session secret
   SESSION_SECRET=local-session-secret-key-12345
   ```

2. Initialize the local database schema from `worker/schema.sql`:

   * **Using sqlite3 (macOS/Linux/Git Bash)**:
     ```bash
     sqlite3 local.db < worker/schema.sql
     ```
   * **Using PowerShell (Windows)**:
     ```powershell
     Get-Content worker/schema.sql | sqlite3 local.db
     ```
   
   *(Note: The `local.db` file will be created in your project root.)*

3. Run the Worker locally:

```bash
npm run api:dev
```

By default Wrangler serves at `http://127.0.0.1:8787`.
Point your frontend at it by setting `BUN_PUBLIC_API_BASE=http://127.0.0.1:8787` in your local env.

### Deploy

Login once:

```bash
npx wrangler login
```

Set secrets (do NOT commit them to git):

```bash
npx wrangler secret put TURSO_DATABASE_URL --config worker/wrangler.toml
npx wrangler secret put TURSO_AUTH_TOKEN --config worker/wrangler.toml
npx wrangler secret put SESSION_SECRET --config worker/wrangler.toml
```

Deploy:

```bash
npm run api:deploy
```

### Apply DB schema (Turso)

You need to apply the schema in [worker/schema.sql](worker/schema.sql) to your Turso database once.

On Windows (example):

```bash
type worker\schema.sql | turso db shell YOUR_DB_NAME
```

### Verify the update

After deploy, Wrangler prints a `*.workers.dev` URL. Verify it responds:

```bash
curl https://YOUR_WORKER_SUBDOMAIN.workers.dev/health
```

#### If the Vercel frontend says "Accounts Offline"

The frontend talks to the API using `BUN_PUBLIC_API_BASE` **at build time**.

- In Vercel Project → Settings → Environment Variables, set:

  - `BUN_PUBLIC_API_BASE=https://YOUR_WORKER_SUBDOMAIN.workers.dev`
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
