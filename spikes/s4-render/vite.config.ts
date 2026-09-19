import { defineConfig } from "vite";

export default defineConfig({
  build: { outDir: "dist", target: "es2022", chunkSizeWarningLimit: 4000 },
  worker: { format: "es" },
});
