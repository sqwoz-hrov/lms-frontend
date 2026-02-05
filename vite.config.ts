import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

const devPort = Number(process.env.DEV_PORT ?? 5173);
const host = process.env.HMR_HOST ?? "127.0.0.1";

export default defineConfig({
	plugins: [react(), tailwind()],
	server: {
		host: true,
		port: devPort,
		strictPort: true,
		allowedHosts: [host],
		origin: `http://${host}/lms`,
		hmr: {
			protocol: (process.env.HMR_PROTOCOL ?? "wss") as "ws" | "wss",
			host,
			clientPort: Number(process.env.HMR_CLIENT_PORT ?? 443),
			path: "/lms",
		},
		proxy: {
			"/lms-api": {
				target: "http://127.0.0.1:3000",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/lms-api/, ""),
			},
		},
		watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === "true" },
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
