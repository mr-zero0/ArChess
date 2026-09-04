import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: { overlay: false },
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
      "/ws": { target: "http://localhost:5000", changeOrigin: true, ws: true }
    }
  },
  build: { outDir: "../static/app", emptyOutDir: true }
});