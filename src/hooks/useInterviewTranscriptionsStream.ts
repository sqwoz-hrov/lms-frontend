import { useMemo } from "react";
import { SseEnvelope, useSse } from "@/providers/SseProvider";

export type InterviewTranscriptionMessage = {
	id?: string;
	event: string;
	transcriptionId?: string;
	text?: string;
	payload: unknown;
	raw: SseEnvelope;
	receivedAt: number;
};

const INTERVIEW_EVENTS = [
	"interview_transcription_chunk",
	"interview_transcription_finished",
	"interview_transcription_error",
];

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
	const baseType = envelope.event;
	const payload = derivePayload(envelope.data);

	const derivedType = firstString(payload["type"], payload["event_type"], payload["event"], baseType);

	if (!derivedType) {
		return null;
	}

	if (!isInterviewType(derivedType)) {
		return null;
	}

	const transcriptionId = firstString(
		payload["interview_transcription_id"],
		payload["transcription_id"],
		payload["id"],
		envelope.id,
	);
	const text = firstString(payload["chunk"], payload["text"], payload["content"], payload["message"]);

	return {
		id: envelope.id,
		event: derivedType,
		transcriptionId: transcriptionId ?? undefined,
		text: text ?? undefined,
		payload,
		raw: envelope,
		receivedAt: envelope.receivedAt,
	};
}

function derivePayload(data: unknown): Record<string, unknown> {
	if (!isRecord(data)) {
		return { raw: data };
	}

	const payload = isRecord(data.payload) ? data.payload : undefined;
	return payload ? { ...data, ...payload } : data;
}

function firstString(...candidates: Array<unknown>): string | null {
	for (const candidate of candidates) {
		if (typeof candidate === "string" && candidate.trim()) {
			return candidate;
		}
	}
	return null;
}

function isInterviewType(type: string) {
	return INTERVIEW_EVENTS.includes(type);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
