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
const host = process.env.HMR_HOST ?? "127.0.0.1";

export default defineConfig({
	plugins: [react(), tailwind(), serveStaticLanding()],
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
			// Proxy API to stage in dev to avoid CORS.
			"/lms-api": {
				target: "https://stage.sqwoz-hrov.ru",
				changeOrigin: true,
				secure: true,
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
