import apiClient from "./client";
import type { VideoResponseDto } from "./videosApi";

export type StartInterviewTranscriptionDto = {
	video_id: string;
};

export type InterviewTranscriptionStatus = "created" | "processing" | "done";

export type InterviewTranscriptionResponseDto = {
	id: string;
	video_id?: string;
	status: InterviewTranscriptionStatus;
	s3_transcription_key: string | null;
	transcription_url?: string | null;
	created_at: string;
	video?: VideoResponseDto | null;
};

export type ListInterviewTranscriptionsParams = {
	user_id?: string;
};

async function start(payload: StartInterviewTranscriptionDto) {
	const { data } = await apiClient.post<InterviewTranscriptionResponseDto>("/interview-transcriptions", payload);
	return data;
}

async function list(params?: ListInterviewTranscriptionsParams) {
	const { data } = await apiClient.get<InterviewTranscriptionResponseDto[]>("/interview-transcriptions", { params });
	return data;
}

async function getById(id: string) {
	const { data } = await apiClient.get<InterviewTranscriptionResponseDto>(
		`/interview-transcriptions/${encodeURIComponent(id)}`,
	);
	return data;
}

async function getByVideoId(videoId: string) {
	const { data } = await apiClient.get<InterviewTranscriptionResponseDto>(
		`/interview-transcriptions/by-video-id/${encodeURIComponent(videoId)}`,
	);
	return data;
}

export const InterviewTranscriptionsApi = {
	start,
	list,
	getById,
	getByVideoId,
};
