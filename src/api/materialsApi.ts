// api/materialsApi.ts — add getById helper (via list+find)
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

const MATERIALS = "/materials";

export async function createMaterial(data: CreateMaterialDto): Promise<MaterialResponseDto> {
	const res = await apiClient.post<MaterialResponseDto>(MATERIALS, data);
	return res.data;
}

export async function updateMaterial(data: UpdateMaterialDto): Promise<MaterialResponseDto> {
	const res = await apiClient.put<MaterialResponseDto>(MATERIALS, data);
	return res.data;
}

export async function archiveMaterial(data: ArchiveMaterialDto): Promise<MaterialResponseDto> {
	const res = await apiClient.put<MaterialResponseDto>(`${MATERIALS}/archive`, data);
	return res.data;
}

export async function getMaterials(params?: {
	student_user_id?: string;
	subject_id?: string;
	is_archived?: boolean;
}): Promise<MaterialResponseDto[]> {
	const res = await apiClient.get<MaterialResponseDto[]>(MATERIALS, { params });
	return res.data;
}

/**
 * Временный getById — пока на бэке нет /materials/:id
 * Реализован через list()+find(). Вернёт null, если не найден.
 */
export async function getMaterialById(id: string): Promise<MaterialResponseDto | null> {
	const all = await getMaterials();
	return all.find(m => m.id === id) ?? null;
}

export const MaterialsApi = {
	create: createMaterial,
	update: updateMaterial,
	archive: archiveMaterial,
	list: getMaterials,
	getById: getMaterialById,
};
