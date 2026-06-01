// In development, Bun intercepts requests to this file (via src/index.ts) and injects dynamic env variables.
// In production, this file is bundled empty, and environment variables are baked in via bun build --define.
globalThis.BUN_PUBLIC_API_BASE = globalThis.BUN_PUBLIC_API_BASE || "";
