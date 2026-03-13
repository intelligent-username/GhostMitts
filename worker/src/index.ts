export interface Env {
  D1_BINDING: {
    prepare: (query: string) => {
      bind: (...args: unknown[]) => {
        run: () => Promise<unknown>;
        first: <T = unknown>() => Promise<T | null>;
      };
    };
  };
  R2_BUCKET: {
    put: (key: string, value: string) => Promise<unknown>;
    get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
  };
  SESSION_SECRET: string;
  // Comma-separated list of allowed browser origins, e.g. "https://ghostmitts.com,https://www.ghostmitts.com"
  // Requests without an Origin header (e.g. curl) will be rejected when this is enforced.
  ALLOWED_ORIGINS: string;
}

type Auth = { ok: true; username: string } | { ok: false };

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string) {
  const salt = crypto.randomUUID();
  const digest = await sha256(`${salt}:${password}`);
  return `${salt}:${digest}`;
}

async function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const digest = await sha256(`${salt}:${password}`);
  return digest === expected;
}

async function signSessionValue(username: string, secret: string) {
  const issued = Date.now().toString();
  const payload = `${username}.${issued}`;
  const signature = await sha256(`${payload}.${secret}`);
  return `${payload}.${signature}`;
}

async function verifySessionValue(raw: string, secret: string): Promise<string | null> {
  const [username, issued, signature] = raw.split(".");
  if (!username || !issued || !signature) return null;
  const expected = await sha256(`${username}.${issued}.${secret}`);
  if (signature !== expected) return null;
  return username;
}

function cookieValue(request: Request, key: string) {
  const cookie = request.headers.get("cookie") || "";
  const found = cookie.split(";").map(s => s.trim()).find(s => s.startsWith(`${key}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(key.length + 1));
}

async function authenticate(request: Request, env: Env): Promise<Auth> {
  const token = cookieValue(request, "session_token");
  if (!token) return { ok: false };
  const username = await verifySessionValue(token, env.SESSION_SECRET);
  if (!username) return { ok: false };
  return { ok: true, username };
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string, request: Request): HeadersInit {
  const reqHeaders = request.headers.get("Access-Control-Request-Headers") || "Content-Type";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
    // Helps caches avoid mixing origins.
    "Vary": "Origin",
  };
}

function getAllowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS || "");
  return allowed.includes(origin) ? origin : null;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // Strict origin allowlist: blocks localhost clones and random sites from calling your API in-browser.
    // NOTE: this does not stop a determined non-browser client spoofing Origin; rely on auth + rate limiting for that.
    const allowedOrigin = getAllowedOrigin(request, env);

    if (method === "OPTIONS") {
      if (!allowedOrigin) return json({ error: "forbidden" }, 403);
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin, request) });
    }

    if (!allowedOrigin) {
      return json({ error: "forbidden" }, 403);
    }

    if (url.pathname === "/register" && method === "POST") {
      const body = await request.json() as { username?: string; password?: string };
      const username = (body.username || "").trim();
      const password = body.password || "";
      if (!username || !password) return json({ error: "username and password required" }, 400, corsHeaders(allowedOrigin, request));

      const passwordHash = await hashPassword(password);
      try {
        await env.D1_BINDING.prepare(
          "INSERT INTO users (username, password_hash) VALUES (?, ?)"
        ).bind(username, passwordHash).run();
      } catch {
        return json({ error: "username already exists" }, 409, corsHeaders(allowedOrigin, request));
      }

      return json({ success: true }, 201, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/login" && method === "POST") {
      const body = await request.json() as { username?: string; password?: string };
      const username = (body.username || "").trim();
      const password = body.password || "";
      if (!username || !password) return json({ error: "username and password required" }, 400, corsHeaders(allowedOrigin, request));

      const user = await env.D1_BINDING.prepare(
        "SELECT username, password_hash FROM users WHERE username = ?"
      ).bind(username).first<{ username: string; password_hash: string }>();

      if (!user) return json({ error: "invalid credentials" }, 401, corsHeaders(allowedOrigin, request));
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) return json({ error: "invalid credentials" }, 401, corsHeaders(allowedOrigin, request));

      const token = await signSessionValue(user.username, env.SESSION_SECRET);
      return json(
        { success: true, username: user.username },
        200,
        {
          "Set-Cookie": `session_token=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`,
          ...corsHeaders(allowedOrigin, request),
        }
      );
    }

    if (url.pathname === "/logout" && method === "POST") {
      return json(
        { success: true },
        200,
        {
          "Set-Cookie": "session_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
          ...corsHeaders(allowedOrigin, request),
        }
      );
    }

    if (url.pathname === "/me" && method === "GET") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ authenticated: false }, 200, corsHeaders(allowedOrigin, request));
      return json({ authenticated: true, username: auth.username }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/sessions/upsert" && method === "POST") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const body = await request.json() as { date?: string; num_combos?: number; time_seconds?: number };
      const date = (body.date || "").trim();
      const numCombos = Math.max(0, Number(body.num_combos || 0));
      const timeSeconds = Math.max(0, Number(body.time_seconds || 0));
      if (!date) return json({ error: "date required" }, 400, corsHeaders(allowedOrigin, request));

      const sessionId = crypto.randomUUID();
      await env.D1_BINDING.prepare(
        `INSERT INTO sessions (session_id, username, date, num_combos, time_seconds)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(username, date) DO UPDATE SET
         num_combos = excluded.num_combos,
         time_seconds = excluded.time_seconds,
         updated_at = CURRENT_TIMESTAMP`
      ).bind(sessionId, auth.username, date, numCombos, timeSeconds).run();

      return json({ success: true }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/presets/upsert" && method === "POST") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const body = await request.json() as { preset_name?: string; preset_data?: unknown };
      const presetName = (body.preset_name || "").trim();
      if (!presetName) return json({ error: "preset_name required" }, 400, corsHeaders(allowedOrigin, request));

      await env.D1_BINDING.prepare(
        `INSERT INTO presets (username, preset_name, preset_data)
         VALUES (?, ?, json(?))
         ON CONFLICT(username, preset_name) DO UPDATE SET
         preset_data = json(excluded.preset_data),
         updated_at = CURRENT_TIMESTAMP`
      ).bind(auth.username, presetName, JSON.stringify(body.preset_data ?? {})).run();

      return json({ success: true }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/history/save" && method === "POST") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const body = await request.json() as { month?: string; data?: unknown };
      const month = (body.month || "").trim();
      if (!month) return json({ error: "month required" }, 400, corsHeaders(allowedOrigin, request));

      await env.R2_BUCKET.put(`${auth.username}/${month}.json`, JSON.stringify(body.data ?? {}));
      return json({ success: true }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname.startsWith("/history/") && method === "GET") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const month = url.pathname.split("/")[2] || "";
      if (!month) return json({ error: "month required" }, 400, corsHeaders(allowedOrigin, request));

      const file = await env.R2_BUCKET.get(`${auth.username}/${month}.json`);
      if (!file) return json({ error: "not found" }, 404, corsHeaders(allowedOrigin, request));
      const text = await file.text();
      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(allowedOrigin, request),
        },
      });
    }

    return json({ error: "not found" }, 404, corsHeaders(allowedOrigin, request));
  },
};
