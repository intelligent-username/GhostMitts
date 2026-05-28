# GhostMitts

A little coach to tell you what combinations to throw.

## Running Locally

### Front end

Install dependencies:

```bash
bun install
```

To start a development server (recommended):

```bash
bun run dev
```

Or build first:

```bash
bun run build
```

Then run for production:

```bash
bun run start
```

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## API (Cloudflare Worker)

The backend API lives in [worker/src/index.ts](worker/src/index.ts) and persists accounts, presets, and workouts to **Turso**.

### Local dev

1. Install dependencies (repo root):

```bash
bun install
```

1. Create a local Wrangler vars file:

```bash
copy worker\.dev.vars.example worker\.dev.vars
```

1. Run the Worker locally:

```bash
bun run api:dev
```

By default Wrangler serves at `http://127.0.0.1:8787`.
Point your frontend at it by setting `BUN_PUBLIC_API_BASE=http://127.0.0.1:8787` in your local env.

### Deploy

Login once:

```bash
bunx wrangler login
```

Set secrets (do NOT commit them to git):

```bash
bunx wrangler secret put TURSO_DATABASE_URL --config worker/wrangler.toml
bunx wrangler secret put TURSO_AUTH_TOKEN --config worker/wrangler.toml
bunx wrangler secret put SESSION_SECRET --config worker/wrangler.toml
```

Deploy:

```bash
bun run api:deploy
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

#### If the Vercel frontend says "API offline"

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
bun run api:tail
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

Make sure to install the edge-tts and other libraries (`run pip install -r requirements.txt`) before running the Python script.
