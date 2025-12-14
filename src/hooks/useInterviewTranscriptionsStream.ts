import { useMemo } from "react";
import { z } from "zod";
import { INTERVIEW_TRANSCRIPTION_EVENT } from "@/constants/interviewTranscriptions";
import { SseEnvelope, useSse } from "@/providers/SseProvider";

const interviewTranscriptionChunkEventSchema = z.object({
	type: z.literal(INTERVIEW_TRANSCRIPTION_EVENT),
	interviewTranscriptionId: z.string(),
	videoId: z.string(),
	chunkIndex: z.number(),
	text: z.string(),
	startTimeSec: z.number(),
	endTimeSec: z.number(),
	speakerLabel: z.string().optional(),
});

const sseEventSchemas = {
	[INTERVIEW_TRANSCRIPTION_EVENT]: interviewTranscriptionChunkEventSchema,
} as const;

type SseEventMap = {
	[K in keyof typeof sseEventSchemas]: z.infer<(typeof sseEventSchemas)[K]>;
};

function validateSseEventPayload<TEvent extends keyof typeof sseEventSchemas>(
	event: TEvent,
	payload: unknown,
): SseEventMap[TEvent] {
	return sseEventSchemas[event].parse(payload);
}

export type InterviewTranscriptionChunkEvent = z.infer<typeof interviewTranscriptionChunkEventSchema>;

export type InterviewTranscriptionMessage = {
	id?: string;
	event: typeof INTERVIEW_TRANSCRIPTION_EVENT;
	transcriptionId: string;
	videoId: string;
	chunkIndex: number;
	text: string;
	startTimeSec: number;
	endTimeSec: number;
	speakerLabel?: string;
	payload: InterviewTranscriptionChunkEvent;
	raw: SseEnvelope;
	receivedAt: number;
};

export function useInterviewTranscriptionsStream() {
	const { events, status, lastError, reconnect } = useSse();

	const messages = useMemo<InterviewTranscriptionMessage[]>(() => {
		return events
			.map(event => normalizeInterviewEvent(event))
			.filter((msg): msg is InterviewTranscriptionMessage => Boolean(msg));
	}, [events]);

	return {
		status,
		lastError,
		reconnect,
		messages,
	};
}

function normalizeInterviewEvent(envelope: SseEnvelope): InterviewTranscriptionMessage | null {
	if (envelope.event !== INTERVIEW_TRANSCRIPTION_EVENT) {
		return null;
	}

	const payload = parseChunkPayload(envelope.data);
	if (!payload) {
		return null;
	}

	return {
		id: envelope.id,
		event: INTERVIEW_TRANSCRIPTION_EVENT,
		transcriptionId: payload.interviewTranscriptionId,
		videoId: payload.videoId,
		chunkIndex: payload.chunkIndex,
		text: payload.text,
		startTimeSec: payload.startTimeSec,
		endTimeSec: payload.endTimeSec,
		speakerLabel: payload.speakerLabel,
		payload,
		raw: envelope,
		receivedAt: envelope.receivedAt,
	};
}

function parseChunkPayload(data: unknown): InterviewTranscriptionChunkEvent | null {
	try {
		return validateSseEventPayload(INTERVIEW_TRANSCRIPTION_EVENT, data);
	} catch {
		return null;
	}
}
