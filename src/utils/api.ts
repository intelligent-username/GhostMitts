import type { GenerationSettings, Move, PresetKey } from "../types";

const API_BASE: string =
  process.env.BUN_PUBLIC_API_BASE ??
  (import.meta as any)?.env?.BUN_PUBLIC_API_BASE ??
  (globalThis as any)?.BUN_PUBLIC_API_BASE ??
  "";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text || `Request failed: ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.error === "string") {
        msg = parsed.error;
      }
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export async function registerAccount(username: string, password: string) {
  return requestJson<{ success: boolean }>("/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function loginAccount(username: string, password: string) {
  return requestJson<{ success: boolean; username: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutAccount() {
  return requestJson<{ success: boolean }>("/logout", { method: "POST" });
}

export async function getMe() {
  return requestJson<{ authenticated: boolean; username?: string }>("/me", { method: "GET" });
}

export async function getBootstrap() {
  return requestJson<{
    username: string;
    todaySession: null | { date: string; num_combos: number; time_seconds: number };
    presets: Array<{ preset_name: string; preset_data: unknown }>;
    streak: number;
    activeDates?: string[];
  }>("/bootstrap", { method: "GET" });
}

export async function insertWorkout(payload: {
  workout_id?: string;
  started_at: string;
  ended_at: string;
  mode: "time" | "combos";
  preset_name: PresetKey;
  speed_ms: number;
  combos_completed: number;
  duration_seconds: number;
  workout_data: unknown;
}, options?: { keepalive?: boolean }) {
  return requestJson<{ success: boolean; workout_id: string }>("/workouts/insert", {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: options?.keepalive,
  });
}

export async function upsertDailySession(payload: {
  date: string;
  num_combos: number;
  time_seconds: number;
}, options?: { keepalive?: boolean }) {
  return requestJson<{ success: boolean }>("/sessions/upsert", {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: options?.keepalive,
  });
}

export async function upsertPreset(payload: {
  preset_name: PresetKey;
  preset_data: {
    moves: Move[];
    generationSettings: GenerationSettings;
    frequencies: Array<{ key: number; weight: number }>;
  };
}, options?: { keepalive?: boolean }) {
  return requestJson<{ success: boolean }>("/presets/upsert", {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: options?.keepalive,
  });
}
