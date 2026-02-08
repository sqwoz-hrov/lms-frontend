import { useEffect, useCallback } from "react";
import { z } from "zod";
import { INTERVIEW_TRANSCRIPTION_STATUS_EVENT } from "@/constants/interviewTranscriptions";
import { useSse } from "@/providers/SseProvider";

const transcriptionStatusSchema = z.object({
	type: z.literal(INTERVIEW_TRANSCRIPTION_STATUS_EVENT),
	interviewTranscriptionId: z.string(),
	videoId: z.string(),
	status: z.enum(["done", "error"]),
	errorMessage: z.string().optional(),
});

export type TranscriptionStatusEvent = z.infer<typeof transcriptionStatusSchema>;

type UseInterviewTranscriptionStatusOptions = {
	/** Video ID to listen for */
	videoId?: string;
	/** Transcription ID to listen for */
	transcriptionId?: string;
	/** Called when transcription completes successfully */
	onComplete?: (event: TranscriptionStatusEvent) => void;
	/** Called when transcription fails */
	onError?: (event: TranscriptionStatusEvent) => void;
};

/**
 * Hook to listen for transcription status changes via SSE
 */
export function useInterviewTranscriptionStatus(options: UseInterviewTranscriptionStatusOptions) {
	const { videoId, transcriptionId, onComplete, onError } = options;
	const { events } = useSse();

	const handleStatusEvent = useCallback(
		(event: TranscriptionStatusEvent) => {
			// Filter by videoId or transcriptionId if provided
			if (videoId && event.videoId !== videoId) return;
			if (transcriptionId && event.interviewTranscriptionId !== transcriptionId) return;

			if (event.status === "done") {
				onComplete?.(event);
			} else if (event.status === "error") {
				onError?.(event);
			}
		},
		[videoId, transcriptionId, onComplete, onError],
	);

	useEffect(() => {
		// Find new status events
		const statusEvents = events
			.filter(e => e.event === INTERVIEW_TRANSCRIPTION_STATUS_EVENT)
			.map(e => {
				try {
					return transcriptionStatusSchema.parse(e.data);
				} catch {
					return null;
				}
			})
			.filter((e): e is TranscriptionStatusEvent => e !== null);

		// Process the most recent event
		if (statusEvents.length > 0) {
			handleStatusEvent(statusEvents[0]);
		}
	}, [events, handleStatusEvent]);
}
