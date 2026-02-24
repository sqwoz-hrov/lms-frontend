import { z } from "zod";
import { INTERVIEW_TRANSCRIPTION_REPORT_READY_EVENT } from "@/constants/interviewTranscriptions";
import { VIDEO_UPLOAD_PHASE_CHANGED_EVENT } from "@/constants/videos";
import type { SseEnvelope } from "@/providers/SseProvider";

export const QUOTES = [
	"👀 **Распознавание** слушает только ваш ролик — посторонние звуки мы стараемся подавлять, но сильный шум может увеличить время обработки.",
	"✍️ За одну минуту речи получается в среднем ~150–180 слов. Если интервью длинное, не удивляйтесь, что итоговый текст выйдет на несколько страниц.",
	"🏷️ Если указать точное число спикеров, модели легче распределять реплики. Когда выбрано «Мне лень», система сама попытается угадать, но спикеры могут перемешаться.",
	"⏳ Большие файлы обрабатываются по частям. Пока идёт транскрибация, можно спокойно закрывать вкладку — прогресс сохранится на сервере.",
	"🎯 После завершения вы сможете открыть детальную страницу: там есть отдельные куски текста, ссылки на исходное видео и возможность перезапуска.",
];

const COMPLETION_EVENT_NAMES = [
	"interview-transcription-complete",
	"interview-transcription-done",
	"interview-transcription-finished",
] as const;

const transcriptionReportReadyEventSchema = z.object({
	transcriptionId: z.string().uuid(),
});
export type TranscriptionReportReadyEventPayload = z.infer<typeof transcriptionReportReadyEventSchema>;

export const uploadPhaseSchema = z.enum(["receiving", "converting", "hashing", "uploading_s3", "completed", "failed"]);
export type UploadPhase = z.infer<typeof uploadPhaseSchema>;

const videoUploadPhaseChangedEventSchema = z.object({
	videoId: z.string().uuid(),
	phase: uploadPhaseSchema,
});
export type VideoUploadPhaseChangedEvent = z.infer<typeof videoUploadPhaseChangedEventSchema>;

export function estimateDisplayDurationMs(text: string): number {
	const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
	const base = 3500;
	const perWord = 220;
	return Math.min(14000, Math.max(base, base + words * perWord));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function pickStringField(obj: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = obj[key];
		if (typeof value === "string" && value) return value;
	}
	return null;
}

export function isTranscriptionCompletionEvent(
	envelope: SseEnvelope,
	targetTranscriptionId: string,
	targetVideoId?: string | null,
): boolean {
	const payload = isRecord(envelope.data) ? envelope.data : null;
	if (!payload) return false;

	const payloadTranscriptionId = pickStringField(payload, [
		"interviewTranscriptionId",
		"interview_transcription_id",
		"transcriptionId",
		"id",
	]);
	const payloadVideoId = pickStringField(payload, ["videoId", "video_id"]);
	const matchesJob =
		(payloadTranscriptionId && payloadTranscriptionId === targetTranscriptionId) ||
		(!payloadTranscriptionId && targetVideoId && payloadVideoId === targetVideoId);

	if (!matchesJob) return false;

	const normalizedEvent = (payload.type as string | undefined) ?? envelope.event;
	const status = (payload.status as string | undefined) ?? (payload.state as string | undefined);

	if (normalizedEvent && (COMPLETION_EVENT_NAMES as readonly string[]).includes(normalizedEvent)) {
		return true;
	}

	if (status && ["done", "completed", "complete", "finished"].includes(status.toLowerCase())) {
		return true;
	}

	return false;
}

export function parseVideoUploadPhaseChangedEvent(envelope: SseEnvelope): VideoUploadPhaseChangedEvent | null {
	if (envelope.event !== VIDEO_UPLOAD_PHASE_CHANGED_EVENT) {
		return null;
	}
	if (!isRecord(envelope.data)) {
		return null;
	}
	const result = videoUploadPhaseChangedEventSchema.safeParse(envelope.data);
	return result.success ? result.data : null;
}

export function isVideoUploadPhaseChangedEvent(envelope: SseEnvelope, targetVideoId?: string): boolean {
	const parsed = parseVideoUploadPhaseChangedEvent(envelope);
	if (!parsed) return false;
	if (!targetVideoId) return true;
	return parsed.videoId === targetVideoId;
}

export function parseTranscriptionReportReadyEvent(envelope: SseEnvelope): TranscriptionReportReadyEventPayload | null {
	if (envelope.event !== INTERVIEW_TRANSCRIPTION_REPORT_READY_EVENT) {
		return null;
	}
	if (!isRecord(envelope.data)) {
		return null;
	}
	const result = transcriptionReportReadyEventSchema.safeParse(envelope.data);
	return result.success ? result.data : null;
}

export function isTranscriptionReportReadyEvent(envelope: SseEnvelope, targetTranscriptionId?: string): boolean {
	const parsed = parseTranscriptionReportReadyEvent(envelope);
	if (!parsed) return false;
	if (!targetTranscriptionId) return true;
	return parsed.transcriptionId === targetTranscriptionId;
}
