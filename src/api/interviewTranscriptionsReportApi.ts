import apiClient from "./client";

export type GetTranscriptionReportParams = {
	transcription_id: string;
}

export type LLMReportHint =
	| {
			hintType: 'error';
			lineId: number;
			topic: string;
			errorType: 'blunder' | 'inaccuracy';
			whyBad: string;
			howToFix: string;
	  }
	| { hintType: 'note'; lineId: number; topic: string; note: string }
	| { hintType: 'praise'; lineId: number; topic: string; praise: string };

export type LLMReportParsed = LLMReportHint[];

export type InterviewTranscriptionReportResponseDto = {
	id: string;
	interview_transcription_id: string;
	llm_report_parsed: LLMReportParsed;
	candidate_name_in_transcription: string;
	candidate_name?: string | null;
}

async function getTranscriptionReport(params: GetTranscriptionReportParams) {
	const { data } = await apiClient.get<InterviewTranscriptionReportResponseDto>(`/interview-transcription-reports/${params.transcription_id}`);
	return data;
}


export const interviewTranscriptionsReportApi = {
    getTranscriptionReport,
};