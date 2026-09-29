import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api is forwarded to the local gateway in dev AND in preview, so the UI
// never talks to anything off this machine. Set VITE_API_BASE at build time
// to point at another host on the internal network.
const proxy = { "/api": "http://127.0.0.1:4000", "/health": "http://127.0.0.1:4000" };
// const proxy = { "/api": "http://127.0.0.1:4100", "/health": "http://127.0.0.1:4100" };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
