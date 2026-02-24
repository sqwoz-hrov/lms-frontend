import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InterviewTranscriptionsApi, type InterviewTranscriptionResponseDto } from "@/api/interviewTranscriptionsApi";
import { VideosApi, type VideoResponseDto } from "@/api/videosApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type InterviewTranscriptionMessage,
	useInterviewTranscriptionsStream,
} from "@/hooks/useInterviewTranscriptionsStream";
import { TranscriptionStatusBadge } from "@/components/interview-transcriptions/TranscriptionStatusBadge";
import { describeVideoPhase, formatDateTime, formatFileSizeFromString } from "../utils";
import { interviewTranscriptionsReportApi, type LLMReportHint } from "@/api/interviewTranscriptionsReportApi";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video/VideoPlayer";

const ERROR_TYPE_MAP = {
	"blunder": <img src="/public/blunder.png" alt="Blunder" title="Blunder: грубая ошибка" className="size-4" />,
	"inaccuracy": <img src="/public/inaccuracy.png" alt="Inaccuracy" title="Inaccuracy: неточный ответ" className="size-4" />,
}
/** Maps backend video phases to the VideoPlayer phase prop */
function toPlayerPhase(p?: string | null): NonNullable<React.ComponentProps<typeof VideoPlayer>["phase"]> {
	switch (p) {
		case "receiving":
		case "hashing":
		case "uploading_s3":
		case "completed":
		case "failed":
			return p;
		case "processing":
		case "converting":
			return "uploading_s3";
		default:
			return "receiving";
	}
}

// ---------------------------------------------------------------------------
// SRT parsing
// ---------------------------------------------------------------------------

export type TranscriptLine = {
	/** 1-based sequential ID from the SRT block */
	id: number;
	/** Start time in seconds */
	start: number;
	/** End time in seconds */
	end: number;
	/** Speaker label extracted from the text (e.g. "SPEAKER_00"), inherited from the previous line if absent */
	speaker: string;
	/** The spoken text without the speaker prefix */
	text: string;
};

/**
 * Parses an SRT timestamp string like "00:01:23,456" into seconds.
 */
function parseSrtTime(ts: string): number {
	// supports both "," and "." as millisecond separator
	const clean = ts.replace(",", ".");
	const parts = clean.split(":");
	if (parts.length !== 3) return 0;
	const [h, m, s] = parts.map(Number);
	return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
}

/**
 * Parses an SRT-like transcript file into an array of {@link TranscriptLine} objects.
 * Each SRT block looks like:
 * ```
 * 1
 * 00:00:00,000 --> 00:00:05,000
 * SPEAKER_00: Hello, world.
 * ```
 */
export function parseSrt(raw: string): TranscriptLine[] {
	const lines: TranscriptLine[] = [];
	// Split on blank lines separating blocks (handle both \r\n and \n)
	const blocks = raw.trim().split(/\n\s*\n/);

	let lastSpeaker = "UNKNOWN";

	for (const block of blocks) {
		const parts = block.trim().split(/\r?\n/);
		if (parts.length < 3) continue;

		const idStr = (parts[0] ?? "").trim();
		const id = parseInt(idStr, 10);
		if (!Number.isFinite(id)) continue;

		const timeLine = (parts[1] ?? "").trim();
		const arrowIdx = timeLine.indexOf("-->");
		if (arrowIdx === -1) continue;

		const start = parseSrtTime(timeLine.slice(0, arrowIdx).trim());
		const end = parseSrtTime(timeLine.slice(arrowIdx + 3).trim());

		// Everything after the timecode line is text (join multi-line blocks)
		const rawText = parts.slice(2).join(" ").trim();

		// Try to extract "SPEAKER_XX:" prefix; fall back to last seen speaker
		const speakerMatch = /^([A-Z][A-Z0-9_]*):\s*(.+)$/s.exec(rawText);
		const speaker = speakerMatch ? (speakerMatch[1] ?? lastSpeaker) : lastSpeaker;
		const text = speakerMatch ? (speakerMatch[2] ?? rawText).trim() : rawText;

		lastSpeaker = speaker;

		lines.push({ id, start, end, speaker, text });
	}

	return lines;
}


export default function InterviewTranscriptionDetailsPage() {
	const params = useParams<{ id: string }>();
	const transcriptionId = params.id ?? "";
	const queryClient = useQueryClient();
	const videoPlayerRef = useRef<VideoPlayerHandle>(null);
	const cachedItem = useMemo(() => {
		const lists = queryClient.getQueriesData<InterviewTranscriptionResponseDto[]>({
			queryKey: ["interview-transcriptions"],
		});
		for (const [, list] of lists) {
			if (!Array.isArray(list)) continue;
			const found = list.find(item => item.id === transcriptionId);
			if (found) return found;
		}
		return undefined;
	}, [queryClient, transcriptionId]);

	const transcriptionQuery = useQuery({
		queryKey: ["interview-transcriptions", transcriptionId],
		enabled: Boolean(transcriptionId),
		queryFn: async () => {
			if (!transcriptionId) {
				throw new Error("Не указан идентификатор расшифровки");
			}
			return InterviewTranscriptionsApi.getById(transcriptionId);
		},
		initialData: cachedItem,
		refetchInterval: query => (query.state.data?.status === "done" ? false : 10_000),
	});

	// TODO: get the SSE event about the report being saved and add to "enabled" condition
	const transcriptionReportQuery = useQuery({
		queryKey: ["interview-transcription-reports", transcriptionId, "report"],
		enabled: Boolean(transcriptionId) && transcriptionQuery.data?.status === "done",
		queryFn: async () => {
			if (!transcriptionId) {
				throw new Error("Не указан идентификатор расшифровки");
			}
			return interviewTranscriptionsReportApi.getTranscriptionReport({ transcription_id: transcriptionId });
		}
	});

	const transcription = transcriptionQuery.data;
	const transcriptionReport = transcriptionReportQuery.data;

	// Fetch full video details (includes presigned video_url) once we know the video id
	const videoId = transcription?.video?.id;
	const {
		data: videoDetails,
		isLoading: videoDetailsLoading,
		isError: videoDetailsError,
		refetch: refetchVideoDetails,
	} = useQuery({
		queryKey: ["video", videoId],
		queryFn: () => VideosApi.getById(videoId!),
		enabled: Boolean(videoId),
		staleTime: 5 * 60_000,
		retry: 1,
	});

	const restartMutation = useMutation({
		mutationFn: async () => {
			if (!transcriptionId) throw new Error("Не указан идентификатор расшифровки");
			return InterviewTranscriptionsApi.restart({ interview_transcription_id: transcriptionId });
		},
		onSuccess: data => {
			queryClient.setQueryData(["interview-transcriptions", transcriptionId], data);
			queryClient.setQueriesData<InterviewTranscriptionResponseDto[]>(
				{ queryKey: ["interview-transcriptions"] },
				prev => {
					if (!Array.isArray(prev)) return prev;
					return prev.map(item => (item.id === data.id ? data : item));
				},
			);
			queryClient.invalidateQueries({ queryKey: ["interview-transcriptions"] });
			toast.success("Расшифровка перезапущена", {
				description: "Мы повторно запустили расшифровку этого интервью.",
			});
		},
		onError: error => {
			const description = error instanceof Error ? error.message : "Не удалось выполнить запрос. Попробуйте ещё раз.";
			toast.error("Не удалось перезапустить расшифровку", { description });
		},
	});

	const [fullText, setFullText] = useState<string | null>(null);
	const [textError, setTextError] = useState<string | null>(null);
	const [textLoading, setTextLoading] = useState(false);

	/** Parsed SRT lines – derived from fullText, kept in memory for report mapping */
	const transcriptLines = useMemo<TranscriptLine[]>(() => {
		if (!fullText) return [];
		return parseSrt(fullText);
	}, [fullText]);

	/** In-memory map from line id → TranscriptLine (for future report mapping) */
	const transcriptLineMap = useMemo<Map<number, TranscriptLine>>(() => {
		const map = new Map<number, TranscriptLine>();
		for (const line of transcriptLines) {
			map.set(line.id, line);
		}
		return map;
	}, [transcriptLines]);

	/**
	 * Maps each SRT lineId → all LLM hints that reference it.
	 * Built from transcriptionReport.llm_report_parsed once both the transcript
	 * and the report are available.
	 */
	const reportHintsByLineId = useMemo<Map<number, LLMReportHint[]>>(() => {
		const hints = transcriptionReport?.llm_report_parsed;
		if (!hints || transcriptLineMap.size === 0) return new Map();
		const map = new Map<number, LLMReportHint[]>();
		for (const hint of hints) {
			const existing = map.get(hint.lineId);
			if (existing) {
				existing.push(hint);
			} else {
				map.set(hint.lineId, [hint]);
			}
		}
		return map;
	}, [transcriptionReport?.llm_report_parsed, transcriptLineMap]);

	useEffect(() => {
		if (!transcription || transcription.status !== "done" || !transcription.transcription_url) {
			setFullText(null);
			setTextError(null);
			setTextLoading(false);
			return;
		}

		let disposed = false;
		setTextLoading(true);
		setTextError(null);

		fetch(transcription.transcription_url)
			.then(res => {
				if (!res.ok) {
					throw new Error("Не удалось загрузить файл расшифровки");
				}
				return res.text();
			})
			.then(text => {
				if (!disposed) {
					setFullText(text);
				}
			})
			.catch(err => {
				if (!disposed) {
					setTextError(err instanceof Error ? err.message : "Ошибка загрузки расшифровки");
				}
			})
			.finally(() => {
				if (!disposed) {
					setTextLoading(false);
				}
			});

		return () => {
			disposed = true;
		};
	}, [transcription?.status, transcription?.transcription_url]);


	return (
		<div className="mx-auto w-full max-w-4xl space-y-4 p-4">
			<div>
				<Button asChild variant="ghost" size="sm">
					<Link to="/interview-transcriptions" className="inline-flex items-center gap-2">
						<ArrowLeft className="size-4" /> Ко всем транскрибациям
					</Link>
				</Button>
			</div>

			{!transcriptionId ? (
				<Card>
					<CardContent className="py-6 text-sm text-destructive">
						Некорректный адрес страницы: идентификатор транскрибации отсутствует.
					</CardContent>
				</Card>
			) : transcriptionQuery.isLoading ? (
				<Card>
					<CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
						<Loader2 className="size-5 animate-spin" />
						Загружаем информацию о транскрибации…
					</CardContent>
				</Card>
			) : transcriptionQuery.isError ? (
				<Card>
					<CardContent className="py-6 text-sm text-destructive">
						Не удалось получить данные о транскрибации. Попробуйте обновить страницу.
					</CardContent>
				</Card>
			) : !transcription ? (
				<Card>
					<CardContent className="py-6 text-sm text-destructive">Транскрибация не найдена.</CardContent>
				</Card>
			) : (
				<>
					<Card>
						<CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3">
							<CardTitle className="text-xl">{ "Транскрибация интервью " + (videoDetails?.filename ?? "")}</CardTitle>
							<div className="space-y-2">
								<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
									<span>
										Старт расшифровки:{" "}
										<span className="text-foreground">{formatDateTime(transcription.created_at)}</span>
									</span>
									{transcription.video?.created_at && (
										<span>
											Видео загружено:{" "}
											<span className="text-foreground">{formatDateTime(transcription.video.created_at)}</span>
										</span>
									)}
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<TranscriptionStatusBadge status={transcription.status} />
								<Button
									variant="outline"
									size="sm"
									onClick={() => restartMutation.mutate()}
									disabled={restartMutation.isPending}
								>
									{restartMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
									Перезапустить
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => transcriptionQuery.refetch()}
									disabled={transcriptionQuery.isFetching}
								>
									{transcriptionQuery.isFetching && <Loader2 className="mr-2 size-4 animate-spin" />}
									Обновить
								</Button>
							</div>
							<div className="flex items-center gap-2">
								{videoDetailsLoading && (
									<span className="text-xs text-muted-foreground flex items-center gap-1">
										<Loader2 className="size-3 animate-spin" /> Загрузка ссылки…
									</span>
								)}
								{videoDetailsError && (
									<Button size="sm" variant="secondary" onClick={() => refetchVideoDetails()}>
										Обновить ссылку
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent>
							<VideoPlayer
								ref={videoPlayerRef}
								src={videoDetails?.video_url}
								type={videoDetails?.mime_type ?? transcription.video?.mime_type ?? "video/mp4"}
								title={transcription.video?.filename}
								phase={toPlayerPhase(videoDetails?.phase ?? transcription.video?.phase)}
							/>
						</CardContent>
					</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Готовая транскрибация</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{textLoading ? (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="size-4 animate-spin" />
										Загружаем текст…
									</div>
								) : textError ? (
									<div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
										{textError}
									</div>
								) : fullText  ? (
									<>
									<TranscriptView
										lines={transcriptLines}
										hintsByLineId={reportHintsByLineId}
										onLineClick={line => videoPlayerRef.current?.seekTo(line.start)}
										candidateNameInTranscription={transcriptionReport?.candidate_name_in_transcription}
										candidateName={transcriptionReport?.candidate_name}
									/>
									</>
								) : transcription.transcription_url ? (
									<div className="text-sm text-muted-foreground">
										Файл транскрибации готов, но не удалось отобразить текст.{" "}
										<a
											href={transcription.transcription_url}
											target="_blank"
											rel="noreferrer"
											className="text-primary underline underline-offset-2"
										>
											Открыть по ссылке
										</a>
										.
									</div>
								) : (
									<div className="text-sm text-muted-foreground">
										Транскрибация завершена, но ссылка с текстом ещё не готова. Попробуйте обновить страницу позже.
									</div>
								)}
								{transcription.transcription_url && (
									<Button asChild variant="outline" size="sm">
										<a href={transcription.transcription_url} target="_blank" rel="noreferrer">
											Скачать исходный файл
										</a>
									</Button>
								)}
							</CardContent>
						</Card>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Transcript rendering
// ---------------------------------------------------------------------------

const SPEAKER_COLORS: Record<string, string> = {
	SPEAKER_00: "text-blue-600 dark:text-blue-400",
	SPEAKER_01: "text-emerald-600 dark:text-emerald-400",
	SPEAKER_02: "text-violet-600 dark:text-violet-400",
	SPEAKER_03: "text-orange-600 dark:text-orange-400",
	SPEAKER_04: "text-rose-600 dark:text-rose-400",
	SPEAKER_05: "text-cyan-600 dark:text-cyan-400",
	SPEAKER_06: "text-amber-600 dark:text-amber-400",
	SPEAKER_07: "text-pink-600 dark:text-pink-400",
	SPEAKER_08: "text-teal-600 dark:text-teal-400",
	SPEAKER_09: "text-indigo-600 dark:text-indigo-400",
};

function speakerColor(speaker: string | null): string {
	if (!speaker) return "text-muted-foreground";
	return SPEAKER_COLORS[speaker] ?? "text-foreground";
}

function TranscriptView({
	lines,
	hintsByLineId,
	onLineClick,
	candidateNameInTranscription,
	candidateName,
}: {
	lines: TranscriptLine[];
	hintsByLineId?: Map<number, LLMReportHint[]>;
	onLineClick?: (line: TranscriptLine) => void;
	/** The raw speaker label used in the transcript for the candidate (e.g. "SPEAKER_01") */
	candidateNameInTranscription?: string | null;
	/** The human-readable name to display instead (e.g. "Иван Иванов"). Falls back to "Собеседуемый". */
	candidateName?: string | null;
}) {
	const [activeId, setActiveId] = useState<number | null>(null);

	if (lines.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">
				Не удалось разобрать текст расшифровки.
			</div>
		);
	}


	/** Resolves the display label for a speaker token. */
	function resolveSpeakerLabel(speaker: string): string {
		if (
			candidateNameInTranscription &&
			speaker.trim().toUpperCase() === candidateNameInTranscription.trim().toUpperCase()
		) {
			return candidateName?.trim() || "Кандидат";
		}
		// old logic
		// return speaker;
		const idx = parseInt(speaker.trim().toUpperCase().replace("SPEAKER_", ""));
		return `Интервьюер ${idx}`;
	}

	return (
		<div className="rounded-lg border bg-card/50 divide-y divide-border/50">
			{lines.map(line => {
				const hints = hintsByLineId?.get(line.id) ?? [];
				const hasError = hints.some(h => h.hintType === "error");
				const errorHints = hints.filter((h): h is Extract<LLMReportHint, { hintType: "error" }> => h.hintType === "error");
				const displaySpeaker = line.speaker ? resolveSpeakerLabel(line.speaker) : null;
				/** Keep the original token for color lookup */
				const colorKey = line.speaker;

				return (
					<button
						key={line.id}
						type="button"
						onClick={() => {
							setActiveId(line.id);
							onLineClick?.(line);
						}}
						className={[
							"w-full text-left px-4 py-2.5 transition-colors",
							"hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
							activeId === line.id ? "bg-accent" : "",
							hasError ? "bg-destructive/5 hover:bg-destructive/10" : "",
						]
							.filter(Boolean)
							.join(" ")}
					>
						<span className="flex items-center gap-4">
							{/* Fixed-width icon slot so all lines stay left-aligned */}
							<span className="shrink-0 w-4 flex items-center justify-center">
								{hasError ? ERROR_TYPE_MAP[errorHints[0].errorType] : null}
							</span>
							<span className="flex flex-1 items-center gap-2 min-w-0">
								<span className={`shrink-0 w-28 text-xs font-semibold uppercase tracking-wide truncate ${displaySpeaker ? speakerColor(colorKey) : ""}`}>
									{displaySpeaker ?? ""}
								</span>
								<span className="flex-1 text-sm leading-relaxed">{line.text}</span>
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

