import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
	plugins: [react(), tailwind()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		outDir: "dist",
		target: "es2018",
		cssTarget: "es2018",
		sourcemap: false,
	},
	// локальный просмотр сборки (в проде отдаёт nginx)
	preview: {
		host: true,
		port: 4173,
	},
});
