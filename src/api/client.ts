// api/client.ts
import axios from "axios";

function normalizeBase(input?: string) {
	let v = (input ?? "/lms-api").trim();
	if (!/^https?:\/\//i.test(v) && !v.startsWith("/")) v = "/" + v;
	return v.replace(/\/+$/, ""); // без хвостового слэша
}

const baseURL = normalizeBase(import.meta.env.VITE_API_URL);
export const apiBaseURL = baseURL;

const apiClient = axios.create({
	baseURL, // например: "/lms-api"
	withCredentials: true,
});

export default apiClient;
