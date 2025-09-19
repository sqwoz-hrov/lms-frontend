// api/videosApi.ts
// Работа с видео: POST /videos (загрузка), GET /videos/{id}

import type { AxiosProgressEvent } from "axios";
import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type VideoResponseDto = {
	id: string;
	original_name: string;
	youtube_link: string;
	created_at: string; // ISO date-time
};

/**
 * Загружает видео
 * POST /videos (multipart/form-data)
 */
export async function uploadVideo(
	file: File,
	params: { onUploadProgress?: (e: AxiosProgressEvent) => void },
): Promise<VideoResponseDto> {
	const formData = new FormData();
	formData.append("file", file);

	const res = await apiClient.post<VideoResponseDto>("/videos", formData, {
		headers: { "Content-Type": "multipart/form-data" },
		...params,
	});
	return res.data;
}

/**
 * Получает видео по id
 * GET /videos/{id}
 */
export async function getVideoById(id: string): Promise<VideoResponseDto> {
	const res = await apiClient.get<VideoResponseDto>(`/videos/${id}`);
	return res.data;
}

// Удобный агрегатор
export const VideosApi = {
	upload: uploadVideo,
	getById: getVideoById,
};
