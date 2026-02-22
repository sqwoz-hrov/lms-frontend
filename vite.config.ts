import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwind()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		proxy: {
			// Проксируем API на stage, чтобы в dev избежать CORS и работать с нужным бэкендом.
			"/lms-api": {
				target: "https://stage.sqwoz-hrov.ru",
				changeOrigin: true,
				secure: true,
			},
		},
	},
});
