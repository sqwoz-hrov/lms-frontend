// vite.config.stage.ts (или ваш dev-конфиг)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

const devPort = Number(process.env.DEV_PORT ?? 5173);
const host = process.env.HMR_HOST ?? "stage.sqwoz-hrov.ru";

export default defineConfig({
  base: "/lms/",
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    host: true,
    port: devPort,
    strictPort: true,
    allowedHosts: [host, ".sqwoz-hrov.ru"],
    origin: `https://${host}/lms`,
    hmr: {
      protocol: (process.env.HMR_PROTOCOL ?? "wss") as "ws" | "wss",
      host,
      clientPort: Number(process.env.HMR_CLIENT_PORT ?? 443),
      path: "/lms",
    },
    proxy: {
      "/lms-api": {
        target: "https://stage.sqwoz-hrov.ru",
        changeOrigin: true,
      },
    },
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === "true" },
  },
});
