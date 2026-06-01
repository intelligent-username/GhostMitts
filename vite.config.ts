import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import sirv from "sirv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const voicegenDir = path.resolve(__dirname, "voicegen");
const voicegenGlob = path.join(voicegenDir, "**/*").replace(/\\/g, "/");

export default defineConfig({
  root: "src",
  envDir: "../",
  envPrefix: ["VITE_", "BUN_PUBLIC_"],
  plugins: [
    react(),
    {
      name: "serve-voicegen",
      configureServer(server) {
        server.middlewares.use(
          "/voicegen",
          sirv(voicegenDir, { etag: true })
        );
      },
    },
    viteStaticCopy({
      targets: [{ src: voicegenGlob, dest: "voicegen" }],
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
