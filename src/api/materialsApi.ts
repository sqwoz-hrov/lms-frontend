// api/materialsApi.ts
// Работа с материалами: POST/PUT/GET /materials + PUT /materials/archive

import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type CreateMaterialDto = {
	subject_id: string;
	name: string;
	type: "article" | "video" | "other";
	student_user_id?: string;
	video_id?: string;
	markdown_content?: string;
};

export type MaterialResponseDto = {
	id: string;
	subject_id: string;
	name: string;
	type: "article" | "video" | "other";
	video_id?: string;
	markdown_content_id?: string;
	markdown_content?: string;
	is_archived: boolean;
};

export type UpdateMaterialDto = {
	id: string;
	subject_id?: string;
	name?: string;
	type?: "article" | "video" | "other";
	student_user_id?: string;
	video_id?: string;
	markdown_content_id?: string;
	markdown_content?: string;
	is_archived?: boolean;
};

export type ArchiveMaterialDto = {
	id: string;
	is_archived: boolean;
};

// ===== API =====
const MATERIALS = "/materials";

/**
 * Создает материал
 * POST /materials
 */
export async function createMaterial(data: CreateMaterialDto): Promise<MaterialResponseDto> {
	const res = await apiClient.post<MaterialResponseDto>(MATERIALS, data);
	return res.data;
}

/**
 * Обновляет материал
 * PUT /materials
 */
export async function updateMaterial(data: UpdateMaterialDto): Promise<MaterialResponseDto> {
	const res = await apiClient.put<MaterialResponseDto>(MATERIALS, data);
	return res.data;
}

/**
 * Архивирует или разархивирует материал
 * PUT /materials/archive
 */
export async function archiveMaterial(data: ArchiveMaterialDto): Promise<MaterialResponseDto> {
	const res = await apiClient.put<MaterialResponseDto>(`${MATERIALS}/archive`, data);
	return res.data;
}

/**
 * Получает список материалов
 * GET /materials?student_user_id=&subject_id=&is_archived=
 */
export async function getMaterials(params?: {
	student_user_id?: string;
	subject_id?: string;
	is_archived?: boolean;
}): Promise<MaterialResponseDto[]> {
	const res = await apiClient.get<MaterialResponseDto[]>(MATERIALS, { params });
	return res.data;
}

// Удобный агрегатор
export const MaterialsApi = {
	create: createMaterial,
	update: updateMaterial,
	archive: archiveMaterial,
	list: getMaterials,
};
