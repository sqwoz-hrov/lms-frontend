// api/subjectsApi.ts
// Работа с учебными предметами: POST/PUT/GET /subjects

import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type CreateSubjectDto = {
	name: string;
	color_code: string;
};

export type SubjectResponseDto = {
	id: string;
	name: string;
	color_code: string;
};

export type UpdateSubjectDto = {
	id: string;
	name?: string;
	color_code?: string;
};

// ===== API =====
const SUBJECTS = "/subjects";

/**
 * Создает предмет
 * POST /subjects
 */
export async function createSubject(data: CreateSubjectDto): Promise<SubjectResponseDto> {
	const res = await apiClient.post<SubjectResponseDto>(SUBJECTS, data);
	return res.data;
}

/**
 * Обновляет предмет
 * PUT /subjects
 */
export async function updateSubject(data: UpdateSubjectDto): Promise<SubjectResponseDto> {
	const res = await apiClient.put<SubjectResponseDto>(SUBJECTS, data);
	return res.data;
}

/**
 * Получает список предметов
 * GET /subjects
 */
export async function getSubjects(): Promise<SubjectResponseDto[]> {
	const res = await apiClient.get<SubjectResponseDto[]>(SUBJECTS);
	return res.data;
}

// Удобный агрегатор
export const SubjectsApi = {
	create: createSubject,
	update: updateSubject,
	list: getSubjects,
};
