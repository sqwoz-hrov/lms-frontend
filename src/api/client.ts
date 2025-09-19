// api/client.ts
// Единый axios-инстанс для всех API вызовов

import axios from "axios";

// URL сервера — можно брать из .env (VITE_ для vite)

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/";

const apiClient = axios.create({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	baseURL,
	withCredentials: true, // если нужны cookie, например при refresh по session
});

// ===== Интерсепторы =====

// Добавляем Authorization header с токеном из localStorage
apiClient.interceptors.request.use(config => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default apiClient;
