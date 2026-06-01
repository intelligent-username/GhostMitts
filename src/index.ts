import { serve } from "bun";

import { existsSync, readFileSync } from "node:fs";

function jsString(value: string) {
  return JSON.stringify(String(value ?? ""));
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

// Bun loads .env by default; many folks use .env.local. Load both (if present).
loadEnvFile(".env.local");
loadEnvFile(".env");

const server = serve({
  port: Number(process.env.PORT || 3000),
  routes: {
    // Runtime config for browser code.
    "/__config.js": () => {
      const apiBase = process.env.BUN_PUBLIC_API_BASE || "";
      return new Response(`globalThis.BUN_PUBLIC_API_BASE = ${jsString(apiBase)};\n`, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    },

    // Serve static audio files
    "/voicegen/*": req => {
      const path = new URL(req.url).pathname;
      return new Response(Bun.file("." + path));
    },

    // Serve index.html for all unmatched routes.
    "/*": () => new Response(Bun.file("src/index.html")),

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
