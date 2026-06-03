import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src",
  envDir: "../",
  envPrefix: ["VITE_", "BUN_PUBLIC_"],
  plugins: [
    react(),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
