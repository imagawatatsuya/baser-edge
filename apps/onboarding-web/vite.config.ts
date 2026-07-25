import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/start/",
  server: {
    port: 5174,
    proxy: {
      "/api": { target: "http://localhost:8790", changeOrigin: true },
    },
  },
});
