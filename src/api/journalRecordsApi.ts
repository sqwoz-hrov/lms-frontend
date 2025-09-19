// api/journalRecordsApi.ts
// Работа с записями журнала: POST/PUT/DELETE/GET /journal-records

import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type CreateJournalRecordDto = {
	date: string; // ISO date
	markdown_content_id: string;
	markdown_content: string; // раскрытый markdown как текст
};

export type BaseJournalRecordDto = {
	id: string;
	date: string; // ISO date
	markdown_content_id: string;
	markdown_content: string;
	created_at: string; // ISO date-time
};

export type UpdateJournalRecordDto = {
	id: string;
	date?: string;
	markdown_content?: string;
};

export type DeleteJournalRecordDto = {
	id: string;
};

// ===== API =====
const JOURNAL = "/journal-records";

/**
 * Создает запись журнала
 * POST /journal-records
 */
export async function createJournalRecord(data: CreateJournalRecordDto): Promise<BaseJournalRecordDto> {
	const res = await apiClient.post<BaseJournalRecordDto>(JOURNAL, data);
	return res.data;
}

/**
 * Обновляет запись журнала
 * PUT /journal-records
 */
export async function updateJournalRecord(data: UpdateJournalRecordDto): Promise<BaseJournalRecordDto> {
	const res = await apiClient.put<BaseJournalRecordDto>(JOURNAL, data);
	return res.data;
}

/**
 * Удаляет запись журнала
 * DELETE /journal-records (body: { id })
 */
export async function deleteJournalRecord(id: string): Promise<BaseJournalRecordDto> {
	const res = await apiClient.delete<BaseJournalRecordDto>(JOURNAL, {
		data: { id } as DeleteJournalRecordDto,
	});
	return res.data;
}

/**
 * Получает список записей журнала
 * GET /journal-records?date=
 */
export async function getJournalRecords(params?: {
	date?: string; // YYYY-MM-DD
}): Promise<BaseJournalRecordDto[]> {
	const res = await apiClient.get<BaseJournalRecordDto[]>(JOURNAL, { params });
	return res.data;
}

// Удобный агрегатор
export const JournalRecordsApi = {
	create: createJournalRecord,
	update: updateJournalRecord,
	remove: deleteJournalRecord,
	list: getJournalRecords,
};
