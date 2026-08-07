// vite.config.stage.ts (или ваш dev-конфиг)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

function serveStaticLanding() {
	const rewrite = (req: { url?: string }) => {
		if (!req.url) return;
		const [pathname, query] = req.url.split("?");
		if (pathname === "/lms/landing" || pathname === "/lms/landing/") {
			req.url = `/lms/landing/index.html${query ? `?${query}` : ""}`;
		}
	};

	return {
		name: "serve-static-landing",
		configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, _res: unknown, next: () => void) => void) => void } }) {
			server.middlewares.use((req, _res, next) => {
				rewrite(req);
				next();
			});
		},
		configurePreviewServer(server: { middlewares: { use: (fn: (req: { url?: string }, _res: unknown, next: () => void) => void) => void } }) {
			server.middlewares.use((req, _res, next) => {
				rewrite(req);
				next();
			});
		},
	};
}

const devPort = Number(process.env.DEV_PORT ?? 5173);
const host = process.env.HMR_HOST ?? "stage.sqwoz-hrov.ru";

export default defineConfig({
	base: "/lms/",
	plugins: [react(), tailwind(), serveStaticLanding()],
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
