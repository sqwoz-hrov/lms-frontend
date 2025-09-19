// api/hrConnectionsApi.ts
// Работа с контактами HR: POST/PUT/DELETE/GET /hr-connections

import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type HrStatus = "waiting_us" | "waiting_hr" | "rejected" | "offer";

export type CreateHrConnectionDto = {
	student_user_id: string;
	name: string;
	status: HrStatus;
	chat_link: string;
};

export type BaseHrConnectionDto = {
	id: string;
	student_user_id: string;
	name: string;
	status: HrStatus;
	created_at: string; // ISO date-time
	chat_link: string;
};

export type UpdateHrConnectionDto = {
	id: string;
	student_user_id?: string;
	name?: string;
	status?: HrStatus;
	chat_link?: string;
};

export type DeleteHrConnectionDto = {
	id: string;
};

// ===== API =====
const HR = "/hr-connections";

/**
 * Создает контакт с HR
 * POST /hr-connections
 */
export async function createHrConnection(data: CreateHrConnectionDto): Promise<BaseHrConnectionDto> {
	const res = await apiClient.post<BaseHrConnectionDto>(HR, data);
	return res.data;
}

/**
 * Редактирует контакт с HR
 * PUT /hr-connections
 */
export async function updateHrConnection(data: UpdateHrConnectionDto): Promise<BaseHrConnectionDto> {
	const res = await apiClient.put<BaseHrConnectionDto>(HR, data);
	return res.data;
}

/**
 * Удаляет контакт с HR
 * DELETE /hr-connections (body: { id })
 */
export async function deleteHrConnection(id: string): Promise<BaseHrConnectionDto> {
	const res = await apiClient.delete<BaseHrConnectionDto>(HR, {
		data: { id } as DeleteHrConnectionDto,
	});
	return res.data;
}

/**
 * Получает список контактов с HR
 * GET /hr-connections?student_user_id=&name=&status=
 */
export async function getHrConnections(params?: {
	student_user_id?: string;
	name?: string;
	status?: HrStatus;
}): Promise<BaseHrConnectionDto[]> {
	const res = await apiClient.get<BaseHrConnectionDto[]>(HR, { params });
	return res.data;
}

// Удобный агрегатор
export const HrConnectionsApi = {
	create: createHrConnection,
	update: updateHrConnection,
	remove: deleteHrConnection,
	list: getHrConnections,
};
