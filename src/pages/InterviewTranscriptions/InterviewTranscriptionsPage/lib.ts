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
