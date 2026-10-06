import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Codespaces port forwarding proxies through *.app.github.dev.
    allowedHosts: [".app.github.dev"],
    // Same-origin API in dev — mirrors the nginx proxy used in the Docker build.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
