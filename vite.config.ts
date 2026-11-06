import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist/client", chunkSizeWarningLimit: 1800 },
  server: {
    proxy: {
      "/ws": { target: "ws://localhost:3001", ws: true },
      "/api": "http://localhost:3001",
    },
  },
});
