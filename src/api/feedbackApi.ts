// api/feedbackApi.ts
// Работа с сущностью Feedback по спецификации /feedback и /feedback/{id}.
// Эндпоинты: POST/PUT/GET /feedback, GET /feedback/{id}  (см. openapi.json).

import apiClient from "./client"; // предполагаю общий сконфигурированный axios-инстанс

// ===== Types (из OpenAPI) =====
export type CreateFeedbackDto = {
	interview_id: string;
	markdown_content_id: string;
	markdown_content: string; // Resolved markdown content as text
};

export type BaseFeedbackDto = {
	id: string;
	interview_id: string;
	markdown_content_id: string;
	markdown_content: string; // Resolved markdown content as text
};

export type UpdateFeedbackDto = {
	id: string;
	interview_id?: string;
	markdown_content?: string; // Resolved markdown content as text
};

export type FeedbackResponseDto = {
	id: string;
	interview_id: string;
	markdown_content_id: string;
	markdown_content: string; // Resolved markdown content as text
};

// ===== API =====
const FEEDBACK = "/feedback";

/**
 * Создает фидбек
 * POST /feedback
 */
export async function createFeedback(data: CreateFeedbackDto): Promise<BaseFeedbackDto> {
	const res = await apiClient.post<BaseFeedbackDto>(FEEDBACK, data);
	return res.data;
}

/**
 * Меняет фидбек
 * PUT /feedback
 */
export async function updateFeedback(data: UpdateFeedbackDto): Promise<FeedbackResponseDto> {
	const res = await apiClient.put<FeedbackResponseDto>(FEEDBACK, data);
	return res.data;
}

/**
 * Получает список фидбека
 * GET /feedback?interview_id=...
 */
export async function getFeedbackList(params?: { interview_id?: string }): Promise<BaseFeedbackDto[]> {
	const res = await apiClient.get<BaseFeedbackDto[]>(FEEDBACK, { params });
	return res.data;
}

/**
 * Получает информацию о конкретном фидбеке
 * GET /feedback/{id}
 */
export async function getFeedbackById(id: string): Promise<BaseFeedbackDto> {
	const res = await apiClient.get<BaseFeedbackDto>(`${FEEDBACK}/${id}`);
	return res.data;
}

// Удобный объект-агрегатор, если нравится такой стиль импорта
export const FeedbackApi = {
	create: createFeedback,
	update: updateFeedback,
	list: getFeedbackList,
	getById: getFeedbackById,
};
