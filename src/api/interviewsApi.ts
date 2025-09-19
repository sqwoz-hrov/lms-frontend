// api/interviewApi.ts
// Работа с собеседованиями: POST/PUT/DELETE/GET /interviews

import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type InterviewType = "screening" | "technical_interview" | "final" | "other";

export type CreateInterviewDto = {
	hr_connection_id: string;
	name: string;
	type: InterviewType;
	video_id?: string;
};

export type BaseInterviewDto = {
	id: string;
	hr_connection_id: string;
	name: string;
	type: InterviewType;
	created_at: string; // ISO date-time
	video_id?: string;
};

export type UpdateInterviewDto = {
	id: string;
	hr_connection_id?: string;
	name?: string;
	type?: InterviewType;
	video_id?: string;
};

export type DeleteInterviewDto = {
	id: string;
};

// ===== API =====
const INTERVIEWS = "/interviews";

/**
 * Создает собеседование
 * POST /interviews
 */
export async function createInterview(data: CreateInterviewDto): Promise<BaseInterviewDto> {
	const res = await apiClient.post<BaseInterviewDto>(INTERVIEWS, data);
	return res.data;
}

/**
 * Редактирует собеседование
 * PUT /interviews
 */
export async function updateInterview(data: UpdateInterviewDto): Promise<BaseInterviewDto> {
	const res = await apiClient.put<BaseInterviewDto>(INTERVIEWS, data);
	return res.data;
}

/**
 * Удаляет собеседование
 * DELETE /interviews (body: { id })
 */
export async function deleteInterview(id: string): Promise<BaseInterviewDto> {
	const res = await apiClient.delete<BaseInterviewDto>(INTERVIEWS, {
		data: { id } as DeleteInterviewDto,
	});
	return res.data;
}

/**
 * Получает список собеседований
 * GET /interviews?hr_connection_id=&type=
 */
export async function getInterviews(params?: {
	hr_connection_id?: string;
	type?: InterviewType;
}): Promise<BaseInterviewDto[]> {
	const res = await apiClient.get<BaseInterviewDto[]>(INTERVIEWS, { params });
	return res.data;
}

// Удобный агрегатор
export const InterviewApi = {
	create: createInterview,
	update: updateInterview,
	remove: deleteInterview,
	list: getInterviews,
};
