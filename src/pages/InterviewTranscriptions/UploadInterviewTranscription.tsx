import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { InterviewTranscriptionsApi } from "@/api/interviewTranscriptionsApi";
import { VideosApi, type GetByIdVideoResponseDto } from "@/api/videosApi";
import { useResumableVideoUpload } from "@/hooks/useResumableVideoUpload";
import { VideoProcessingPreview } from "@/components/video/VideoProcessingPreview";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSse, type SseEnvelope } from "@/providers/SseProvider";

const INTERVIEW_TYPES = ["Скрининг", "Техническое собеседование", "Систем дизайн"] as const;
type InterviewType = (typeof INTERVIEW_TYPES)[number];

const SPEAKER_OPTIONS: { value: string; label: string }[] = [
	{ value: "lazy", label: "Мне лень" },
	...Array.from({ length: 20 }, (_, idx) => {
		const count = idx + 1;
		return { value: String(count), label: `${count}` };
	}),
];

const QUOTES = [
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

type CompletionEventName = (typeof COMPLETION_EVENT_NAMES)[number];

function estimateDisplayDurationMs(text: string) {
	const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
	const base = 3500;
	const perWord = 220; // примерно 270–300 слов в минуту на чтение
	const duration = base + words * perWord;
	return Math.min(14000, Math.max(base, duration));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function pickStringField(obj: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = obj[key];
		if (typeof value === "string" && value) {
			return value;
		}
	}
	return null;
}

function isTranscriptionCompletionEvent(
	envelope: SseEnvelope,
	targetTranscriptionId: string,
	targetVideoId?: string | null,
) {
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

	if (
		normalizedEvent &&
		(COMPLETION_EVENT_NAMES as readonly string[]).includes(normalizedEvent as CompletionEventName)
	) {
		return true;
	}

	if (status && ["done", "completed", "complete", "finished"].includes(status.toLowerCase())) {
		return true;
	}

	return false;
}

type QuotesPanelProps = {
	quotes: string[];
	activeIndex: number;
	onNext: () => void;
	onPrev: () => void;
};

function QuotesPanel({ quotes, activeIndex, onNext, onPrev }: QuotesPanelProps) {
	const activeQuote = quotes[activeIndex] ?? "";

	return (
		<Card className="border-0 bg-muted/40 shadow-xl">
			<CardHeader className="flex items-center justify-center pb-3">
				<div className="flex items-center gap-2">
					<Loader2 className="size-5 animate-spin text-primary/80" aria-hidden="true" />
					<CardTitle className="text-lg">Анализируем интервью</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="flex min-h-[260px] items-center gap-3 pt-0">
				<div className="flex w-full items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						className="h-12 w-12 transition hover:-translate-y-0.5 focus-visible:ring-0 focus-visible:ring-offset-0"
						onClick={onPrev}
						aria-label="Предыдущая цитата"
					>
						<ChevronLeft className="size-5" />
					</Button>
					<div className="flex-1 rounded-2xl bg-transperent px-6 py-6 text-center shadow-inner">
						<MarkdownRenderer markdown={activeQuote} mode="full" className="bg-transparent text-sm leading-relaxed" />
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-12 w-12 transition hover:-translate-y-0.5 focus-visible:ring-0 focus-visible:ring-offset-0"
						onClick={onNext}
						aria-label="Следующая цитата"
					>
						<ChevronRight className="size-5" />
					</Button>
				</div>
			</CardContent>
			<div className="mt-auto flex items-center justify-center pb-2">
				<div className="px-4 py-1 text-xs font-medium text-slate-200">
					{activeIndex + 1} / {quotes.length}
				</div>
			</div>
		</Card>
	);
}

export default function UploadInterviewTranscriptionPage() {
	const navigate = useNavigate();
	const { events: sseEvents } = useSse();
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [isDragActive, setIsDragActive] = useState(false);
	const [speakerCount, setSpeakerCount] = useState<string>("lazy");
	const [interviewType, setInterviewType] = useState<InterviewType | undefined>(undefined);
	const [showQuotes, setShowQuotes] = useState(false);
	const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
	const [startedTranscriptionId, setStartedTranscriptionId] = useState<string | null>(null);
	const [startedVideoId, setStartedVideoId] = useState<string | null>(null);
	const [completedTranscriptionId, setCompletedTranscriptionId] = useState<string | null>(null);

	const {
		start: startUpload,
		status: uploadStatus,
		progress,
		error: uploadError,
		video: uploadedVideo,
	} = useResumableVideoUpload();

	const videoId = uploadedVideo?.id;
	const {
		data: uploadedVideoDetails,
		isFetching: isFetchingPreview,
		isError: previewError,
		refetch: refetchPreview,
	} = useQuery<GetByIdVideoResponseDto>({
		queryKey: ["interview-transcription-upload-video", videoId],
		queryFn: () => VideosApi.getById(videoId!),
		enabled: Boolean(videoId),
		staleTime: 30_000,
		refetchOnWindowFocus: false,
	});

	const startTranscription = useMutation({
		mutationFn: (videoId: string) => InterviewTranscriptionsApi.start({ video_id: videoId }),
		onSuccess: data => {
			setStartedTranscriptionId(data.id);
			setStartedVideoId(prev => prev ?? data.video_id ?? null);
			setCompletedTranscriptionId(null);
			toast.success("Транскрибация запущена");
		},
		onError: err => {
			const message = err instanceof Error ? err.message : "Не удалось запустить транскрибацию";
			toast.error(message);
			setShowQuotes(false);
			setStartedTranscriptionId(null);
			setStartedVideoId(null);
		},
	});

	const isUploading = uploadStatus === "uploading" || uploadStatus === "paused";
	const uploadedFileLabel = useMemo(
		() => uploadedVideo?.filename ?? uploadedVideoDetails?.filename ?? null,
		[uploadedVideo, uploadedVideoDetails],
	);
	const canStart = Boolean(uploadedVideo?.id && interviewType);
	const previewUrl = uploadedVideoDetails?.video_url;
	const previewMime = uploadedVideo?.mime_type ?? uploadedVideoDetails?.mime_type ?? "video/mp4";
	const hasUploadedVideo = Boolean(videoId);
	const previewHelperText = previewError
		? "Не удалось получить ссылку на видео. Нажмите «Обновить», чтобы попробовать ещё раз."
		: previewUrl
			? "Если превью не появилось, обновите статус или попробуйте позже."
			: "Видео проходит внутренние шаги (хэширование, загрузка). Ссылка появится автоматически.";

	const handleFileUpload = useCallback(
		async (file?: File) => {
			if (!file) return;
			try {
				setShowQuotes(false);
				setActiveQuoteIndex(0);
				setStartedTranscriptionId(null);
				setStartedVideoId(null);
				setCompletedTranscriptionId(null);
				await startUpload(file);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Не удалось загрузить видео";
				toast.error(message);
			}
		},
		[startUpload],
	);

	const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		await handleFileUpload(file);
		if (event.target) event.target.value = "";
	};

	const handleDropZoneClick = () => fileInputRef.current?.click();
	const handleDropZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleDropZoneClick();
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(true);
		event.dataTransfer.dropEffect = "copy";
	};

	const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);
	};

	const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);
		const file = event.dataTransfer.files?.[0];
		await handleFileUpload(file);
	};

	const handleStartTranscription = async () => {
		if (!uploadedVideo?.id || !interviewType) return;
		setShowQuotes(true);
		setActiveQuoteIndex(0);
		setStartedVideoId(uploadedVideo.id);
		setCompletedTranscriptionId(null);
		try {
			await startTranscription.mutateAsync(uploadedVideo.id);
		} catch {
			setShowQuotes(false);
			setActiveQuoteIndex(0);
			setStartedVideoId(null);
			setStartedTranscriptionId(null);
		}
	};

	const isAwaitingCompletion = Boolean(startedTranscriptionId && !completedTranscriptionId);

	useEffect(() => {
		if (!showQuotes) return;
		const currentQuote = QUOTES[activeQuoteIndex] ?? "";
		const timer = window.setTimeout(() => {
			setActiveQuoteIndex(prev => (prev + 1) % QUOTES.length);
		}, estimateDisplayDurationMs(currentQuote));

		return () => {
			window.clearTimeout(timer);
		};
	}, [activeQuoteIndex, showQuotes]);

	useEffect(() => {
		if (!startedTranscriptionId) return;
		const match = sseEvents.find(event =>
			isTranscriptionCompletionEvent(event, startedTranscriptionId, startedVideoId),
		);
		if (match) {
			setCompletedTranscriptionId(startedTranscriptionId);
		}
	}, [sseEvents, startedTranscriptionId, startedVideoId]);

	return (
		<div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold">Загрузите интервью для транскрибации</h1>
				<p className="text-sm text-muted-foreground">
					Перетащите видео или выберите файл, укажите ключевые параметры и запустите транскрибацию.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Видео интервью</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					<input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleInputChange} />

					{hasUploadedVideo ? (
						<VideoProcessingPreview
							title="Видео обрабатывается"
							description="Следим за статусом файла — как только он будет готов, появится ссылка для просмотра."
							filename={uploadedFileLabel}
							src={previewUrl}
							mimeType={previewMime}
							phase={uploadedVideoDetails?.phase ?? uploadedVideo?.phase}
							helperText={previewHelperText}
							helperTextTone={previewError ? "error" : "default"}
							actions={
								<>
									<Button size="sm" variant="outline" onClick={handleDropZoneClick}>
										<UploadCloud className="mr-2 size-4" />
										Заменить видео
									</Button>
									<Button size="sm" variant="ghost" onClick={() => refetchPreview()} disabled={isFetchingPreview}>
										{isFetchingPreview ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
										Обновить
									</Button>
								</>
							}
						/>
					) : (
						<>
							<div
								role="button"
								tabIndex={0}
								className={cn(
									"border-muted-foreground/30 hover:border-muted-foreground/60 bg-card text-card-foreground flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
									isDragActive && "border-primary bg-primary/5",
								)}
								onClick={handleDropZoneClick}
								onKeyDown={handleDropZoneKeyDown}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<UploadCloud className="mb-3 size-10 text-muted-foreground" />
								<p className="text-base font-medium">Перетащите видео сюда или выберите файл</p>
								<p className="text-sm text-muted-foreground">Разрешены все форматы видео, размер ограничен тарифом.</p>
								<Button className="mt-4" type="button" variant="outline">
									Выбрать файл
								</Button>
							</div>

							{isUploading && (
								<div className="space-y-2">
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>Прогресс загрузки</span>
										<span>{progress.pct}%</span>
									</div>
									<div className="h-2 w-full rounded-full bg-muted">
										<div
											className="h-full rounded-full bg-primary transition-all"
											style={{ width: `${progress.pct}%` }}
										/>
									</div>
								</div>
							)}

							{uploadError && <p className="text-sm text-destructive">Ошибка загрузки: {uploadError}</p>}
						</>
					)}
				</CardContent>
			</Card>

			{showQuotes ? (
				<div className="mx-auto w-full md:w-3/5">
					<QuotesPanel
						quotes={QUOTES}
						activeIndex={activeQuoteIndex}
						onNext={() => setActiveQuoteIndex(idx => (idx + 1) % QUOTES.length)}
						onPrev={() => setActiveQuoteIndex(idx => (idx - 1 + QUOTES.length) % QUOTES.length)}
					/>
				</div>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Детали интервью</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label>Количество участников</Label>
							<Select value={speakerCount} onValueChange={setSpeakerCount}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SPEAKER_OPTIONS.map(option => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Выбор опционален. Значение «Мне лень» означает, что точное количество неизвестно.
							</p>
						</div>

						<div className="grid gap-2">
							<Label>Тип интервью</Label>
							<Select
								value={interviewType}
								onValueChange={value => setInterviewType(value as InterviewType)}
								disabled={startTranscription.isPending}
							>
								<SelectTrigger>
									<SelectValue placeholder="Выберите тип интервью" />
								</SelectTrigger>
								<SelectContent>
									{INTERVIEW_TYPES.map(type => (
										<SelectItem key={type} value={type}>
											{type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{interviewType === "Систем дизайн" && (
								<div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
									<AlertTriangle className="size-4 text-amber-500" />
									<span>Мы плохо анализируем этот тип собеседования.</span>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			<div className="flex flex-wrap items-center justify-end gap-3">
				{completedTranscriptionId ? (
					<Button
						variant="secondary"
						onClick={() => navigate(`/interview-transcriptions/${completedTranscriptionId}`)}
						className="order-2 sm:order-1"
					>
						Открыть транскрибацию
					</Button>
				) : null}
				<Button
					size="lg"
					disabled={!canStart || startTranscription.isPending || isAwaitingCompletion}
					onClick={handleStartTranscription}
					className="order-1 sm:order-2"
				>
					{startTranscription.isPending ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Запуск…
						</>
					) : isAwaitingCompletion ? (
						"Ждём завершения…"
					) : (
						"Запустить транскрибацию"
					)}
				</Button>
			</div>
		</div>
	);
}
