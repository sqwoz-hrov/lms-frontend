import { InterviewTranscriptionsApi, type InterviewTranscriptionResponseDto } from "@/api/interviewTranscriptionsApi";
import { interviewTranscriptionsReportApi, type LLMReportHint } from "@/api/interviewTranscriptionsReportApi";
import { VideosApi } from "@/api/videosApi";
import { ErrorNavigator } from "@/components/interview-transcriptions/ErrorNavigator";
import { TranscriptionStatusBadge } from "@/components/interview-transcriptions/TranscriptionStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video/VideoPlayer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpToLine, Loader2, Pin, PinOff, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { formatDateTime } from "../utils";

const ERROR_TYPE_MAP = {
	blunder: <img src="/public/blunder.png" alt="Blunder" title="Blunder: грубая ошибка" className="size-4" />,
	inaccuracy: (
		<img src="/public/inaccuracy.png" alt="Inaccuracy" title="Inaccuracy: неточный ответ, можно было чуть лучше" className="size-4" />
	),
	missedWin: (
		<img src="/public/missed-win.png" alt="Missed Win" title="Missed Win: упущенная возможность выделиться" className="size-4" />
	),
	mistake: (
		<img src="/public/mistake.png" alt="Mistake" title="Mistake: ошибка" className="size-4" />
	)
};
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

// ---------------------------------------------------------------------------
// VideoPlayerContainer – wraps the player with floating / sticky behaviour
// ---------------------------------------------------------------------------

export type PlayerMode = "floating" | "sticky";

/**
 * A container that wraps children (the VideoPlayer) and provides two modes:
 *
 * • **floating**  – When the player scrolls out of the viewport it
 *   shrinks into a small PiP window fixed to the bottom-left corner.
 *
 * • **sticky** (default) – The player uses `position: sticky; top: 0` so it sticks to
 *   the top of the viewport when scrolled past.
 *
 * A small control bar lets the user toggle between the two modes. In floating
 * PiP mode, buttons to scroll back and to switch modes are rendered on the
 * floating widget itself.
 */
function VideoPlayerContainer({
	children,
	mode,
	onModeChange,
	onOutOfViewChange,
}: {
	children: ReactNode;
	mode: PlayerMode;
	onModeChange: (mode: PlayerMode) => void;
	/** Called when the player's out-of-view state changes */
	onOutOfViewChange?: (outOfView: boolean) => void;
}) {
	const setMode = onModeChange;

	/**
	 * A sentinel element placed *before* the player in the DOM. When this
	 * element leaves the viewport we know the player has scrolled out of view.
	 */
	const sentinelRef = useRef<HTMLDivElement>(null);
	/** Ref to the actual player wrapper – used to measure its natural height for the placeholder. */
	const playerWrapperRef = useRef<HTMLDivElement>(null);

	/** True when the sentinel is not intersecting – i.e. player has scrolled out. */
	const [isOutOfView, setIsOutOfView] = useState(false);
	/** Natural height of the player wrapper, used to keep a placeholder so the page doesn't jump. */
	const [naturalHeight, setNaturalHeight] = useState<number | undefined>(undefined);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				const out = !(entry?.isIntersecting ?? true);
				setIsOutOfView(out);
				onOutOfViewChange?.(out);
				// Capture height right before we detach the player so the placeholder can
				// prevent layout shift.
				if (out && playerWrapperRef.current) {
					setNaturalHeight(playerWrapperRef.current.offsetHeight);
				}
			},
			{ threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [onOutOfViewChange]);

	const scrollBack = useCallback(() => {
		sentinelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, []);

	const showPip = mode === "floating" && isOutOfView;
	/** In sticky mode the player is fixed to the top when scrolled out of view */
	const showStickyFixed = mode === "sticky" && isOutOfView;

	/*
	 * Rendering strategy (single <video> element, no remount):
	 *
	 * 1. A zero-height sentinel marks the player's natural scroll position.
	 * 2. The player wrapper is ALWAYS rendered in-flow.
	 *    - In **sticky** mode, when out of view, it uses `position: fixed; top: 0`
	 *      spanning the content-area width. A placeholder keeps layout stable.
	 *    - In **floating / PiP** mode, when the sentinel leaves the viewport,
	 *      the wrapper gets `position: fixed; bottom-left; small size`.
	 *      A same-height placeholder keeps layout stable.
	 *    - Otherwise it sits in normal flow.
	 */

	/** Whether we need a placeholder to prevent layout jump */
	const needsPlaceholder = (showPip || showStickyFixed) && naturalHeight != null;

	const wrapperClasses = showPip
		? "fixed bottom-4 left-4 z-50 w-80 max-w-[40vw] rounded-xl overflow-hidden shadow-2xl border bg-card ring-1 ring-border/60 transition-all duration-300"
		: showStickyFixed
			? "fixed top-0 left-0 right-0 z-50 mx-auto w-full max-w-4xl px-4 pt-2 pb-1 bg-background/95 backdrop-blur-sm shadow-lg transition-all duration-300"
			: "transition-all duration-300";

	return (
		<>
			{/* Sentinel – zero-height div that marks the player's natural position */}
			<div ref={sentinelRef} className="h-0" />

			{/* ── Mode toggle switch (always in-flow, above the player) ──────── */}
			<div className="flex items-center justify-end mb-1">
				<div className="inline-flex items-center rounded-lg border bg-muted/50 p-0.5 text-xs">
					<button
						type="button"
						onClick={() => setMode("floating")}
						title="Плавающий режим (PiP)"
						className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
							mode === "floating"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<PinOff className="size-3" />
						Плавающее
					</button>
					<button
						type="button"
						onClick={() => setMode("sticky")}
						title="Закрепить сверху"
						className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
							mode === "sticky"
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Pin className="size-3" />
						Закрепить
					</button>
				</div>
			</div>

			{/* Placeholder to prevent layout jump when PiP/Sticky detaches the player from flow */}
			{needsPlaceholder && <div style={{ height: naturalHeight }} />}

			{/* ── Player wrapper ─────────────────────────────────────────────── */}
			<div ref={playerWrapperRef} data-video-player-wrapper className={wrapperClasses}>
				{/* PiP toolbar – only visible when floating PiP is active */}
				{showPip && (
					<div className="flex items-center justify-between px-2.5 py-1.5 bg-card/90 backdrop-blur-sm border-b border-border/50">
						<span className="text-[11px] font-medium text-muted-foreground truncate">Видео</span>
						<div className="flex items-center gap-0.5">
							<button
								type="button"
								onClick={scrollBack}
								title="Вернуться к плееру"
								className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								<ArrowUpToLine className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setMode("sticky")}
								title="Закрепить сверху"
								className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								<Pin className="size-3.5" />
							</button>
						</div>
					</div>
				)}
				{/* Sticky toolbar – shows scroll-back button when sticky-fixed */}
				{showStickyFixed && (
					<div className="flex items-center justify-between mb-1">
						<span className="text-[11px] font-medium text-muted-foreground truncate">Видео (закреплено)</span>
						<div className="flex items-center gap-0.5">
							<button
								type="button"
								onClick={scrollBack}
								title="Вернуться к плееру"
								className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								<ArrowUpToLine className="size-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setMode("floating")}
								title="Переключить на PiP"
								className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								<PinOff className="size-3.5" />
							</button>
						</div>
					</div>
				)}
				{children}
			</div>
		</>
	);
}

export default function InterviewTranscriptionDetailsPage() {
	const params = useParams<{ id: string }>();
	const transcriptionId = params.id ?? "";
	const queryClient = useQueryClient();
	const videoPlayerRef = useRef<VideoPlayerHandle>(null);

	// Lifted state for VideoPlayerContainer
	const [playerMode, setPlayerMode] = useState<PlayerMode>("sticky");
	const [playerOutOfView, setPlayerOutOfView] = useState(false);

	/** Controls which view is shown in the transcript card */
	const [transcriptViewMode, setTranscriptViewMode] = useState<"detailed" | "summary">("detailed");

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
		},
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

	/** Ordered list of line IDs that have at least one error hint */
	const errorLineIds = useMemo<number[]>(() => {
		const ids: number[] = [];
		for (const line of transcriptLines) {
			const hints = reportHintsByLineId.get(line.id);
			if (hints?.some(h => h.hintType === "error")) {
				ids.push(line.id);
			}
		}
		return ids;
	}, [transcriptLines, reportHintsByLineId]);

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
							<CardTitle className="text-xl">{"Транскрибация интервью " + (videoDetails?.filename ?? "")}</CardTitle>
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
							<VideoPlayerContainer
								mode={playerMode}
								onModeChange={setPlayerMode}
								onOutOfViewChange={setPlayerOutOfView}
							>
								<VideoPlayer
									ref={videoPlayerRef}
									src={videoDetails?.video_url}
									type={videoDetails?.mime_type ?? transcription.video?.mime_type ?? "video/mp4"}
									title={transcription.video?.filename}
									phase={toPlayerPhase(videoDetails?.phase ?? transcription.video?.phase)}
								/>
							</VideoPlayerContainer>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
							<CardTitle className="text-lg">Готовая транскрибация</CardTitle>
							{/* View mode toggle */}
							<div className="inline-flex items-center rounded-lg border bg-muted/50 p-0.5 text-xs">
								<button
									type="button"
									onClick={() => setTranscriptViewMode("detailed")}
									className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
										transcriptViewMode === "detailed"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									Подробно
								</button>
								<button
									type="button"
									onClick={() => setTranscriptViewMode("summary")}
									className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
										transcriptViewMode === "summary"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									Кратко
								</button>
							</div>
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
							) : fullText ? (
								<>
									{/* Pre-render both, toggle visibility */}
									<div className={transcriptViewMode === "detailed" ? "" : "hidden"}>
										<TranscriptView
											lines={transcriptLines}
											hintsByLineId={reportHintsByLineId}
											onSeek={secs => videoPlayerRef.current?.seekTo(secs)}
											candidateNameInTranscription={transcriptionReport?.candidate_name_in_transcription}
											candidateName={transcriptionReport?.candidate_name}
										/>
									</div>
									<div className={transcriptViewMode === "summary" ? "" : "hidden"}>
										<TranscriptSummary hints={transcriptionReport?.llm_report_parsed ?? null} />
									</div>
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

					<ErrorNavigator
						errorLineIds={errorLineIds}
						playerMode={playerMode}
						visible={playerOutOfView && errorLineIds.length > 0}
					/>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Transcript rendering
// ---------------------------------------------------------------------------

/**
 * A compact summary of all LLM report hints. Groups errors by severity
 * (blunder → inaccuracy) and lists the topics where mistakes occurred.
 * Notes and praises are shown as separate counts for quick reference.
 */
function TranscriptSummary({ hints }: { hints: LLMReportHint[] | null }) {
	if (!hints || hints.length === 0) {
		return (
			<div className="rounded-lg border bg-muted/30 p-5 text-sm text-muted-foreground">
				Краткая сводка недоступна — отчёт ещё не готов или не содержит данных.
			</div>
		);
	}

	const errors = hints.filter((h): h is Extract<LLMReportHint, { hintType: "error" }> => h.hintType === "error");
	const blunders = errors.filter(e => e.errorType === "blunder");
	const inaccuracies = errors.filter(e => e.errorType === "inaccuracy");
	const missedWins = errors.filter(e => e.errorType === "missedWin");
	const mistakes = errors.filter(e => e.errorType === "mistake");

	// Deduplicated list of topics that had errors, in order of first occurrence
	const errorTopics = Array.from(new Map(errors.map(e => [e.topic.toLowerCase(), e.topic])).values());

	return (
		<div className="space-y-4">
			{/* Error severity counters */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex flex-col justify-between min-h-[5rem] cursor-default">
							<span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide my-auto">
								{ERROR_TYPE_MAP["blunder"]}
								Критические ошибки
							</span>
							<span className="text-2xl font-bold text-destructive tabular-nums mt-2">{blunders.length}</span>
						</div>
					</TooltipTrigger>
					<TooltipContent side="bottom">Blunder — грубая ошибка, серьёзно навредила ответу</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex flex-col justify-between min-h-[5rem] cursor-default">
							<span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide my-auto">
								{ERROR_TYPE_MAP["mistake"]}
								Серьёзные ошибки
							</span>
							<span className="text-2xl font-bold text-destructive tabular-nums mt-2">{mistakes.length}</span>
						</div>
					</TooltipTrigger>
					<TooltipContent side="bottom">Mistake — ошибка, заметно снизила качество ответа</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="rounded-lg border border-orange-400/40 bg-orange-50/40 dark:bg-orange-950/20 p-3 flex flex-col justify-between min-h-[5rem] cursor-default">
							<span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide my-auto">
								{ERROR_TYPE_MAP["missedWin"]}
								Не идеально
							</span>
							<span className="text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums mt-2">{missedWins.length}</span>
						</div>
					</TooltipTrigger>
					<TooltipContent side="bottom">Missed Win — упущенная возможность выделиться</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="rounded-lg border border-orange-400/40 bg-orange-50/40 dark:bg-orange-950/20 p-3 flex flex-col justify-between min-h-[5rem] cursor-default">
							<span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide my-auto">
								{ERROR_TYPE_MAP["inaccuracy"]}
								Неточности
							</span>
							<span className="text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums mt-2">{inaccuracies.length}</span>
						</div>
					</TooltipTrigger>
					<TooltipContent side="bottom">Inaccuracy — небольшая неточность, можно было чуть лучше</TooltipContent>
				</Tooltip>
			</div>

			{/* Topics with errors */}
			{errorTopics.length > 0 && (
				<div className="rounded-lg border bg-card/50 p-4 space-y-2">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Темы с ошибками ({errorTopics.length})
					</p>
					<ul className="space-y-1.5">
						{errorTopics.map(topic => {
							const topicErrors = errors.filter(e => e.topic.toLowerCase() === topic.toLowerCase());
							const topicBlunders = topicErrors.filter(e => e.errorType === "blunder").length;
							const topicInaccuracies = topicErrors.filter(e => e.errorType === "inaccuracy").length;
							const topicMissedWins = topicErrors.filter(e => e.errorType === "missedWin").length;
							const topicMistakes = topicErrors.filter(e => e.errorType === "mistake").length;

							return (
								<li key={topic} className="flex items-center justify-between gap-2 text-sm">
									<span className="capitalize">{topic}</span>
									<span className="flex items-center gap-1.5 shrink-0">
										{topicBlunders > 0 && (
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive cursor-default">
														{ERROR_TYPE_MAP["blunder"]}
														{topicBlunders}
													</span>
												</TooltipTrigger>
												<TooltipContent>Зевок — ошибка, которая могла стоить интервью</TooltipContent>
											</Tooltip>
										)}
										{topicMistakes > 0 && (
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive cursor-default">
														{ERROR_TYPE_MAP["mistake"]}
														{topicMistakes}
													</span>
												</TooltipTrigger>
												<TooltipContent>Серьёзная ошибка</TooltipContent>
											</Tooltip>
										)}
										{topicMissedWins > 0 && (
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="inline-flex items-center gap-0.5 text-xs font-medium text-orange-600 dark:text-orange-400 cursor-default">
														{ERROR_TYPE_MAP["missedWin"]}
														{topicMissedWins}
													</span>
												</TooltipTrigger>
												<TooltipContent>Упущенная возможность выделиться</TooltipContent>
											</Tooltip>
										)}
										{topicInaccuracies > 0 && (
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="inline-flex items-center gap-0.5 text-xs font-medium text-orange-600 dark:text-orange-400 cursor-default">
														{ERROR_TYPE_MAP["inaccuracy"]}
														{topicInaccuracies}
													</span>
												</TooltipTrigger>
												<TooltipContent>Неточный ответ</TooltipContent>
											</Tooltip>
										)}
									</span>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}

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

/** Formats seconds into a compact timecode string, e.g. 75.3 → "1:15" */
function formatTimecode(secs: number): string {
	const h = Math.floor(secs / 3600);
	const m = Math.floor((secs % 3600) / 60);
	const s = Math.floor(secs % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	return `${m}:${String(s).padStart(2, "0")}`;
}

function TranscriptView({
	lines,
	hintsByLineId,
	onSeek,
	candidateNameInTranscription,
	candidateName,
}: {
	lines: TranscriptLine[];
	hintsByLineId?: Map<number, LLMReportHint[]>;
	/** Called when the user clicks the timecode badge to seek the video */
	onSeek?: (secs: number) => void;
	/** The raw speaker label used in the transcript for the candidate (e.g. "SPEAKER_01") */
	candidateNameInTranscription?: string | null;
	/** The human-readable name to display instead (e.g. "Иван Иванов"). Falls back to "Собеседуемый". */
	candidateName?: string | null;
}) {
	const [drawerLine, setDrawerLine] = useState<TranscriptLine | null>(null);

	if (lines.length === 0) {
		return <div className="text-sm text-muted-foreground">Не удалось разобрать текст расшифровки.</div>;
	}

	/** Resolves the display label for a speaker token. */
	function resolveSpeakerLabel(speaker: string): string {
		if (
			candidateNameInTranscription &&
			speaker.trim().toUpperCase() === candidateNameInTranscription.trim().toUpperCase()
		) {
			return candidateName?.trim() || "Кандидат";
		}
		const idx = parseInt(speaker.trim().toUpperCase().replace("SPEAKER_", ""));
		return `Интервьюер ${idx}`;
	}

	const drawerHints = drawerLine ? (hintsByLineId?.get(drawerLine.id) ?? []) : [];

	return (
		<>
			<div data-transcript-view className="rounded-lg border bg-card/50 divide-y divide-border/50">
				{lines.map(line => {
					const hints = hintsByLineId?.get(line.id) ?? [];
					const hasError = hints.some(h => h.hintType === "error");
					const errorHints = hints.filter(
						(h): h is Extract<LLMReportHint, { hintType: "error" }> => h.hintType === "error",
					);
					const hasHints = hints.length > 0;
					const displaySpeaker = line.speaker ? resolveSpeakerLabel(line.speaker) : null;
					const colorKey = line.speaker;

					return (
						<button
							key={line.id}
							data-line-id={line.id}
							type="button"
							onClick={() => {
								if (hasHints) setDrawerLine(line);
							}}
							className={[
								"group w-full text-left px-4 py-2.5 transition-colors",
								hasHints
									? "cursor-pointer hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
									: "cursor-default",
								hasError ? "bg-destructive/5 hover:bg-destructive/10" : "",
							]
								.filter(Boolean)
								.join(" ")}
						>
							<span className="flex items-center gap-4">
								{/* Timecode badge – visible on hover, clicking seeks the video */}
								<span
									className="shrink-0 w-10 text-right"
									onClick={e => {
										e.stopPropagation();
										onSeek?.(line.start);
									}}
								>
									<span className="invisible group-hover:visible inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted hover:bg-accent hover:text-foreground transition-colors cursor-pointer select-none">
										<Play className="size-2.5 fill-current" />
										{formatTimecode(line.start)}
									</span>
								</span>

								{/* Fixed-width icon slot so all lines stay left-aligned */}
								<span className="shrink-0 w-4 flex items-center justify-center">
									{hasError ? ERROR_TYPE_MAP[errorHints[0].errorType] : null}
								</span>

								<span className="flex flex-1 items-center gap-2 min-w-0">
									<span
										className={`shrink-0 w-28 text-xs font-semibold uppercase tracking-wide truncate ${displaySpeaker ? speakerColor(colorKey) : ""}`}
									>
										{displaySpeaker ?? ""}
									</span>
									<span className="flex-1 text-sm leading-relaxed">{line.text}</span>
								</span>
							</span>
						</button>
					);
				})}
			</div>

			{/* Hint drawer */}
			<Sheet
				open={drawerLine !== null}
				onOpenChange={open => {
					if (!open) setDrawerLine(null);
				}}
			>
				<SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
					<SheetHeader className="mb-4">
						<SheetTitle className="text-base">
							{drawerLine && resolveSpeakerLabel(drawerLine.speaker)}
							{drawerLine && (
								<button
									type="button"
									className="ml-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
									onClick={() => {
										onSeek?.(drawerLine.start);
									}}
								>
									{formatTimecode(drawerLine.start)}
								</button>
							)}
						</SheetTitle>
						{drawerLine && <p className="text-sm text-muted-foreground leading-relaxed mt-1">{drawerLine.text}</p>}
					</SheetHeader>

					<div className="space-y-4">
						{drawerHints.map((hint, i) => (
							<HintCard key={i} hint={hint} />
						))}
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}

function HintCard({ hint }: { hint: LLMReportHint }) {
	if (hint.hintType === "error") {
		return (
			<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
				<div className="flex items-center gap-2">
					{ERROR_TYPE_MAP[hint.errorType]}
					<span className="text-sm font-semibold text-destructive capitalize">{hint.topic}</span>
				</div>
				<div className="space-y-1">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Почему плохо</p>
					<p className="text-sm leading-relaxed">{hint.whyBad}</p>
				</div>
				<div className="space-y-1">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Как исправить</p>
					<p className="text-sm leading-relaxed">{hint.howToFix}</p>
				</div>
			</div>
		);
	}

	if (hint.hintType === "note") {
		return (
			<div className="rounded-lg border bg-muted/40 p-4 space-y-2">
				<p className="text-sm font-semibold">{hint.topic}</p>
				<p className="text-sm leading-relaxed text-muted-foreground">{hint.note}</p>
			</div>
		);
	}

	if (hint.hintType === "praise") {
		return (
			<div className="rounded-lg border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-2">
				<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{hint.topic}</p>
				<p className="text-sm leading-relaxed">{hint.praise}</p>
			</div>
		);
	}

	return null;
}
