import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

function normalizeBase(value: string): string {
	const trimmed = value.trim();
	if (!trimmed || trimmed === "/") return "/";
	return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig(({ mode }) => {
	const fileEnv = loadEnv(mode, process.cwd(), "");
	const base = normalizeBase(process.env.VITE_FRONTEND_URL_PREFIX ?? fileEnv.VITE_FRONTEND_URL_PREFIX ?? "/lms");

	return {
		base,
		plugins: [react(), tailwind()],
		resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
		build: {
			outDir: "dist",
			target: "es2018",
			cssTarget: "es2018",
			sourcemap: false,
		},
		preview: { host: true, port: 4173 },
	};
});
