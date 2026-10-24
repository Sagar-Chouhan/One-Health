import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server on 5173. The portal CSS, images and mock-data JS live in
// public/assets and are served at /assets/... unchanged from the HTML build.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 8082,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 8082,
    allowedHosts: ["onehealth-stage.indevconsultancy.in"],
  },
});
