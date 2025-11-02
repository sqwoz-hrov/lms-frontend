import apiClient from "./client";

export type CreateSubjectDto = { name: string; color_code: string };
export type SubjectResponseDto = {
	id: string;
	name: string;
	color_code: string;
	subscription_tier_ids?: string[];
};
export type UpdateSubjectDto = { id: string; name?: string; color_code?: string };
export type OpenSubjectForTiersDto = { tier_ids: string[] };

const SUBJECTS = "/subjects";

export async function createSubject(data: CreateSubjectDto): Promise<SubjectResponseDto> {
	const res = await apiClient.post<SubjectResponseDto>(SUBJECTS, data);
	return res.data;
}

export async function updateSubject(data: UpdateSubjectDto): Promise<SubjectResponseDto> {
	const res = await apiClient.put<SubjectResponseDto>(SUBJECTS, data);
	return res.data;
}

export async function getSubjects(): Promise<SubjectResponseDto[]> {
	const res = await apiClient.get<SubjectResponseDto[]>(SUBJECTS);
	return res.data;
}

export async function getSubjectById(id: string): Promise<SubjectResponseDto | null> {
	const all = await getSubjects();
	return all.find(s => s.id === id) ?? null;
}

export async function openSubjectForTiers(id: string, data: OpenSubjectForTiersDto): Promise<Record<string, unknown>> {
	const res = await apiClient.post<Record<string, unknown>>(`${SUBJECTS}/${id}/open-for-tiers`, data);
	return res.data;
}

export const SubjectsApi = {
	create: createSubject,
	update: updateSubject,
	list: getSubjects,
	getById: getSubjectById,
	openForTiers: openSubjectForTiers,
};
