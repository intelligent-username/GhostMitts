import { serve } from "bun";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

// Load env files
loadEnvFile(".env.local");
loadEnvFile(".env");

const port = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";
const distDir = existsSync("./dist") ? "./dist" : "./src";

if (isProd && !existsSync("./dist/index.html")) {
  console.warn("⚠️ Warning: dist/index.html not found. Run 'npm run build' first to generate production assets.");
}

const server = serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    // Runtime config injection if requested
    if (pathname === "/__config.js") {
      const apiBase = process.env.BUN_PUBLIC_API_BASE || process.env.VITE_API_BASE || "";
      return new Response(`globalThis.BUN_PUBLIC_API_BASE = ${jsString(apiBase)};\n`, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // Static file serving: check distDir first, then src/public
    const safePath = pathname.replace(/\.\./g, "").replace(/^\/+/, "");
    if (safePath) {
      const distFile = Bun.file(join(distDir, safePath));
      if (await distFile.exists()) {
        return new Response(distFile);
      }
      const publicFile = Bun.file(join("./src/public", safePath));
      if (await publicFile.exists()) {
        return new Response(publicFile);
      }
    }

    // Fallback to SPA index.html
    const indexFile = Bun.file(join(distDir, "index.html"));
    return new Response(indexFile, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
  development: !isProd && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url} (${isProd ? "production" : "development"}, serving ${distDir})`);
