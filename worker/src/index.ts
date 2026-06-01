import { connect } from "@tursodatabase/serverless";

export interface Env {
  // Turso (preferred)
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  // Back-compat with older local env var names
  TURSO_URL?: string;
  TURSO_TOKEN?: string;

  // Legacy Cloudflare storage (optional; not used for account/session/preset storage anymore)
  D1_BINDING?: unknown;
  R2_BUCKET?: {
    put: (key: string, value: string) => Promise<unknown>;
    get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
  };

  SESSION_SECRET: string;
  // Comma-separated list of allowed browser origins
  // Requests without an Origin header (e.g. curl) will be rejected when this is enforced.
  ALLOWED_ORIGINS: string | string[];
}

type Auth = { ok: true; username: string } | { ok: false };

function getTursoConfig(env: Env): { url: string; authToken: string } {
  const url = (env.TURSO_DATABASE_URL || env.TURSO_URL || "").trim();
  const authToken = (env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN || "").trim();
  if (!url || !authToken) {
    throw new Error("Missing TURSO_DATABASE_URL/TURSO_AUTH_TOKEN");
  }
  return { url, authToken };
}

function db(env: Env) {
  const { url, authToken } = getTursoConfig(env);
  return connect({ url, authToken });
}

async function dbRun(env: Env, sql: string, args: unknown[] = []) {
  const conn = db(env);
  const stmt = await conn.prepare(sql);
  return stmt.run(args as any);
}

async function dbGet<T>(env: Env, sql: string, args: unknown[] = []): Promise<T | null> {
  const conn = db(env);
  const stmt = await conn.prepare(sql);
  const row = await stmt.get(args as any);
  return (row as T) ?? null;
}

async function dbAll<T>(env: Env, sql: string, args: unknown[] = []): Promise<T[]> {
  const conn = db(env);
  const stmt = await conn.prepare(sql);
  const rows = await stmt.all(args as any);
  return (rows as T[]) ?? [];
}

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

function todayUtcStr() {
  return new Date().toISOString().split("T")[0] || "";
}

function addDaysUtc(dateStr: string, deltaDays: number) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split("T")[0] || "";
}

function computeStreakFromDates(descDates: string[]) {
  if (descDates.length === 0) return 0;

  const set = new Set(descDates);
  const today = todayUtcStr();
  const yesterday = addDaysUtc(today, -1);

  // Standard streak behavior: if no activity today, streak counts up to yesterday.
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : "";
  if (!cursor) return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysUtc(cursor, -1);
  }
  return streak;
}

function parseAllowedOrigins(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).map(s => s.trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
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

function isLocalhostOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function siteKey(hostname: string): string {
  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  return parts.slice(-2).join(".");
}

function isCrossSiteRequest(url: URL, origin: string | null, fetchSite: string): boolean {
  switch (fetchSite) {
    case "same-origin":
    case "same-site":
      return false;
    case "cross-site":
      return true;
  }

  if (!origin) return false;
  try {
    const o = new URL(origin);
    return siteKey(o.hostname) !== siteKey(url.hostname);
  } catch {
    return false;
  }
}

function getAllowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  // Safety net for local dev: if you forgot to set ALLOWED_ORIGINS,
  // allow only localhost (not the entire internet).
  if (allowed.length === 0) return isLocalhostOrigin(origin) ? origin : null;
  return allowed.includes(origin) ? origin : null;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const isHttps = url.protocol === "https:";
    const fetchSite = (request.headers.get("Sec-Fetch-Site") || "").toLowerCase();
    const origin = request.headers.get("Origin");
    const isCrossSite = isCrossSiteRequest(url, origin, fetchSite);

    // Strict origin allowlist: blocks localhost clones and random sites from calling your API in-browser.
    // NOTE: this does not stop a determined non-browser client spoofing Origin; rely on auth + rate limiting for that.
    const allowedOrigin = getAllowedOrigin(request, env);

    // Health check: helps verify deployments quickly.
    // - Works with curl (no Origin header)
    // - Includes CORS headers only when Origin is allowed
    if (url.pathname === "/health" && method === "GET") {
      return json(
        { ok: true, time: new Date().toISOString() },
        200,
        allowedOrigin ? corsHeaders(allowedOrigin, request) : undefined
      );
    }

    if (method === "OPTIONS") {
      if (!allowedOrigin) return json({ error: "forbidden" }, 403);
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin, request) });
    }

    if (!allowedOrigin) {
      return json({ error: "forbidden" }, 403);
    }

    try {

    if (url.pathname === "/register" && method === "POST") {
      const body = await request.json() as { username?: string; password?: string };
      const username = (body.username || "").trim();
      const password = body.password || "";
      if (!username || !password) return json({ error: "username and password required" }, 400, corsHeaders(allowedOrigin, request));

      const passwordHash = await hashPassword(password);
      try {
        await dbRun(env, "INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, passwordHash]);
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? "").toLowerCase();
        if (msg.includes("unique") || msg.includes("constraint") || msg.includes("duplicate")) {
          return json({ error: "username already exists" }, 409, corsHeaders(allowedOrigin, request));
        }
        return json({ error: "server error: " + String(e?.message ?? e) }, 500, corsHeaders(allowedOrigin, request));
      }

      return json({ success: true }, 201, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/login" && method === "POST") {
      const body = await request.json() as { username?: string; password?: string };
      const username = (body.username || "").trim();
      const password = body.password || "";
      if (!username || !password) return json({ error: "username and password required" }, 400, corsHeaders(allowedOrigin, request));

      const user = await dbGet<{ username: string; password_hash: string }>(
        env,
        "SELECT username, password_hash FROM users WHERE username = ?",
        [username]
      );

      if (!user) return json({ error: "invalid credentials" }, 401, corsHeaders(allowedOrigin, request));
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) return json({ error: "invalid credentials" }, 401, corsHeaders(allowedOrigin, request));

      const token = await signSessionValue(user.username, env.SESSION_SECRET);

      // SameSite handling:
      // - Same-site (common when serving UI+API from same domain or localhost): Strict
      // - Cross-site (e.g. Vercel UI calling Workers API): None (requires Secure)
      const sameSite = isCrossSite ? (isHttps ? "None" : "Lax") : "Strict";
      const secureAttr = isHttps ? " Secure;" : "";

      return json(
        { success: true, username: user.username },
        200,
        {
          "Set-Cookie": `session_token=${encodeURIComponent(token)}; Path=/; HttpOnly;${secureAttr} SameSite=${sameSite}; Max-Age=${60 * 60 * 24 * 30}`,
          ...corsHeaders(allowedOrigin, request),
        }
      );
    }

    if (url.pathname === "/logout" && method === "POST") {
      const sameSite = isCrossSite ? (isHttps ? "None" : "Lax") : "Strict";
      const secureAttr = isHttps ? " Secure;" : "";
      return json(
        { success: true },
        200,
        {
          "Set-Cookie": `session_token=; Path=/; HttpOnly;${secureAttr} SameSite=${sameSite}; Max-Age=0`,
          ...corsHeaders(allowedOrigin, request),
        }
      );
    }

    if (url.pathname === "/me" && method === "GET") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ authenticated: false }, 200, corsHeaders(allowedOrigin, request));
      return json({ authenticated: true, username: auth.username }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/bootstrap" && method === "GET") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const today = todayUtcStr();

      const [todaySession, presetRows, activeDays] = await Promise.all([
        dbGet<{ date: string; num_combos: number; time_seconds: number }>(
          env,
          "SELECT date, num_combos, time_seconds FROM sessions WHERE username = ? AND date = ?",
          [auth.username, today]
        ),
        dbAll<{ preset_name: string; preset_data: unknown }>(
          env,
          "SELECT preset_name, preset_data FROM presets WHERE username = ?",
          [auth.username]
        ),
        dbAll<{ date: string }>(
          env,
          "SELECT date FROM sessions WHERE username = ? AND (num_combos > 0 OR time_seconds > 0) ORDER BY date DESC LIMIT 400",
          [auth.username]
        ),
      ]);

      const presets = presetRows.map((r) => {
        let parsed: unknown = r.preset_data;
        if (typeof parsed === "string") {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        return { preset_name: r.preset_name, preset_data: parsed };
      });

      const dates = activeDays.map(r => r.date).filter(Boolean);
      const streak = computeStreakFromDates(dates);

      return json(
        {
          username: auth.username,
          todaySession: todaySession ?? null,
          presets,
          streak,
          activeDates: dates,
        },
        200,
        corsHeaders(allowedOrigin, request)
      );
    }

    if (url.pathname === "/workouts/insert" && method === "POST") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const body = await request.json() as {
        workout_id?: string;
        started_at?: string;
        ended_at?: string;
        mode?: string;
        preset_name?: string;
        speed_ms?: number;
        combos_completed?: number;
        duration_seconds?: number;
        workout_data?: unknown;
      };

      const workoutId = (body.workout_id || crypto.randomUUID()).trim();
      const startedAt = (body.started_at || "").trim();
      const endedAt = (body.ended_at || "").trim();
      const mode = (body.mode || "").trim();
      const presetName = (body.preset_name || "").trim();
      const speedMs = body.speed_ms == null ? null : Math.max(0, Number(body.speed_ms));
      const combosCompleted = Math.max(0, Number(body.combos_completed || 0));
      const durationSeconds = Math.max(0, Number(body.duration_seconds || 0));

      if (!startedAt || !endedAt || !mode) {
        return json({ error: "started_at, ended_at, and mode are required" }, 400, corsHeaders(allowedOrigin, request));
      }

      const date = startedAt.split("T")[0] || todayUtcStr();
      const payloadJson = body.workout_data == null ? null : JSON.stringify(body.workout_data);

      // 1) Insert detailed workout segment
      await dbRun(
        env,
        `INSERT INTO workouts (
           workout_id, username, date, started_at, ended_at, mode, preset_name, speed_ms, combos_completed, duration_seconds, workout_data
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, json(?))`,
        [
          workoutId,
          auth.username,
          date,
          startedAt,
          endedAt,
          mode,
          presetName || null,
          speedMs,
          combosCompleted,
          durationSeconds,
          payloadJson,
        ]
      );

      // 2) Accumulate daily totals (used for on-demand streak calculation)
      const sessionId = crypto.randomUUID();
      await dbRun(
        env,
        `INSERT INTO sessions (session_id, username, date, num_combos, time_seconds)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(username, date) DO UPDATE SET
         num_combos = sessions.num_combos + excluded.num_combos,
         time_seconds = sessions.time_seconds + excluded.time_seconds,
         updated_at = CURRENT_TIMESTAMP`,
        [sessionId, auth.username, date, combosCompleted, durationSeconds]
      );

      return json({ success: true, workout_id: workoutId }, 200, corsHeaders(allowedOrigin, request));
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
      await dbRun(
        env,
        `INSERT INTO sessions (session_id, username, date, num_combos, time_seconds)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(username, date) DO UPDATE SET
         num_combos = excluded.num_combos,
         time_seconds = excluded.time_seconds,
         updated_at = CURRENT_TIMESTAMP`,
        [sessionId, auth.username, date, numCombos, timeSeconds]
      );

      return json({ success: true }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/presets/upsert" && method === "POST") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const body = await request.json() as { preset_name?: string; preset_data?: unknown };
      const presetName = (body.preset_name || "").trim();
      if (!presetName) return json({ error: "preset_name required" }, 400, corsHeaders(allowedOrigin, request));

      await dbRun(
        env,
        `INSERT INTO presets (username, preset_name, preset_data)
         VALUES (?, ?, json(?))
         ON CONFLICT(username, preset_name) DO UPDATE SET
         preset_data = json(excluded.preset_data),
         updated_at = CURRENT_TIMESTAMP`,
        [auth.username, presetName, JSON.stringify(body.preset_data ?? {})]
      );

      return json({ success: true }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname === "/history/save" && method === "POST") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const body = await request.json() as { month?: string; data?: unknown };
      const month = (body.month || "").trim();
      if (!month) return json({ error: "month required" }, 400, corsHeaders(allowedOrigin, request));

      if (!env.R2_BUCKET) return json({ error: "history storage not configured" }, 501, corsHeaders(allowedOrigin, request));
      await env.R2_BUCKET.put(`${auth.username}/${month}.json`, JSON.stringify(body.data ?? {}));
      return json({ success: true }, 200, corsHeaders(allowedOrigin, request));
    }

    if (url.pathname.startsWith("/history/") && method === "GET") {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: "unauthorized" }, 401, corsHeaders(allowedOrigin, request));

      const month = url.pathname.split("/")[2] || "";
      if (!month) return json({ error: "month required" }, 400, corsHeaders(allowedOrigin, request));

      if (!env.R2_BUCKET) return json({ error: "history storage not configured" }, 501, corsHeaders(allowedOrigin, request));
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
    } catch {
      return json({ error: "server error" }, 500, corsHeaders(allowedOrigin, request));
    }
  },
};
