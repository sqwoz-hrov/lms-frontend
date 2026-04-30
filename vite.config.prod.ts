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

export default defineConfig({
	base: "/lms/",
	plugins: [react(), tailwind(), serveStaticLanding()],
	resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
	build: {
		outDir: "dist",
		target: "es2018",
		cssTarget: "es2018",
		sourcemap: false,
	},
	preview: { host: true, port: 4173 },
});
