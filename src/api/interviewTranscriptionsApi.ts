import apiClient from "./client";

export type StartInterviewTranscriptionDto = {
	video_id: string;
};

export type InterviewTranscriptionStatus = "created" | "processing" | "done";

export type InterviewTranscriptionResponseDto = {
	id: string;
	video_id: string;
	status: InterviewTranscriptionStatus;
	s3_transcription_key: string | null;
	created_at: string;
};

export const InterviewTranscriptionsApi = {
	async start(payload: StartInterviewTranscriptionDto) {
		const { data } = await apiClient.post<InterviewTranscriptionResponseDto>("/interview-transcriptions", payload);
		return data;
	},
};
