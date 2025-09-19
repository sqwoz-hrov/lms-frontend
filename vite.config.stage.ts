import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

const devPort = Number(process.env.DEV_PORT ?? 5173);

export default defineConfig({
	plugins: [react(), tailwind()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		host: true, // 0.0.0.0 для докера
		port: devPort,
		strictPort: true,
		hmr: {
			// для Traefik за HTTPS нужен wss + clientPort=443
			protocol: (process.env.HMR_PROTOCOL ?? "wss") as "ws" | "wss",
			host: process.env.HMR_HOST, // ваш DEV_DOMAIN
			clientPort: Number(process.env.HMR_CLIENT_PORT ?? 443),
		},
		watch: {
			usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
		},
	},
});
