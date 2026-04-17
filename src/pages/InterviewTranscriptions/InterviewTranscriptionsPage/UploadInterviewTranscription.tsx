import { InterviewTranscriptionsApi } from "@/api/interviewTranscriptionsApi";
import { interviewTranscriptionsReportApi } from "@/api/interviewTranscriptionsReportApi";
import { VideosApi, type GetByIdVideoResponseDto } from "@/api/videosApi";
import { Button } from "@/components/ui/button";
import { UsageLimitReachedBanner } from "@/components/interview-transcriptions/UsageLimitReachedBanner";
import { useResumableVideoUpload } from "@/hooks/useResumableVideoUpload";
import { useInterviewTranscriptionLimitReached } from "@/hooks/useInterviewTranscriptionLimitReached";
import { useSse } from "@/providers/SseProvider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { QuotesPanel } from "./components/AfterUpload/QuotesPanel";
import { InterviewDetailsForm, type InterviewType } from "./components/BeforeUpload/InterviewDetailsForm";
import { VideoDropZone } from "./components/BeforeUpload/VideoDropZone";
import {
	QUOTES,
	estimateDisplayDurationMs,
	isTranscriptionCompletionEvent,
	isTranscriptionReportReadyEvent,
	isVideoUploadPhaseChangedEvent,
	parseTranscriptionReportReadyEvent,
	parseVideoUploadPhaseChangedEvent,
	type UploadPhase,
} from "./lib";

export default function UploadInterviewTranscriptionPage() {
	const navigate = useNavigate();
	const { events: sseEvents } = useSse();
	const { isLimitReached, whichExceeded } = useInterviewTranscriptionLimitReached();

	const [speakerCount, setSpeakerCount] = useState<string>("lazy");
	const [interviewType, setInterviewType] = useState<InterviewType | undefined>(undefined);
	const [showQuotes, setShowQuotes] = useState(false);
	const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
	const [startedTranscriptionId, setStartedTranscriptionId] = useState<string | null>(null);
	const [startedVideoId, setStartedVideoId] = useState<string | null>(null);
	const [completedTranscriptionId, setCompletedTranscriptionId] = useState<string | null>(null);
	const [liveVideoPhase, setLiveVideoPhase] = useState<UploadPhase | undefined>(undefined);
	const reportOpeningRef = useRef<string | null>(null);
	const handledVideoPhaseEventsRef = useRef<Set<string>>(new Set());

	const isMockUploadEnabled = String(import.meta.env.VITE_INTERVIEW_UPLOAD_MOCK ?? "").toLowerCase() === "true";

	const uploadHookOptions = useMemo(
		() => (isMockUploadEnabled ? { mock: true, mockDuration: 15000, mockErrorProbability: 0.1 } : undefined),
		[isMockUploadEnabled],
	);

	const {
		start: startUpload,
		status: uploadStatus,
		progress,
		error: uploadError,
		video: uploadedVideo,
	} = useResumableVideoUpload(uploadHookOptions);

	const videoId = uploadedVideo?.id;
	const {
		data: uploadedVideoDetails,
		isError: previewError,
		refetch: refetchPreview,
	} = useQuery<GetByIdVideoResponseDto>({
		queryKey: ["interview-transcription-upload-video", videoId],
		queryFn: () => VideosApi.getById(videoId!),
		enabled: Boolean(videoId),
		staleTime: 30_000,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		handledVideoPhaseEventsRef.current.clear();
		setLiveVideoPhase(undefined);
	}, [videoId]);

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
	const canStart = Boolean(uploadedVideo?.id && interviewType) && !isLimitReached;
	const isAwaitingCompletion = Boolean(startedTranscriptionId && !completedTranscriptionId);

	const handleFileSelected = useCallback(
		async (file: File) => {
			if (isLimitReached) return;
			try {
				setShowQuotes(false);
				setActiveQuoteIndex(0);
				setStartedTranscriptionId(null);
				setStartedVideoId(null);
				setCompletedTranscriptionId(null);
				await startUpload(file);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Не удалось загрузить видео");
			}
		},
		[startUpload, isLimitReached],
	);

	const handleStartTranscription = async () => {
		if (!uploadedVideo?.id || !interviewType || isLimitReached) return;
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

	// Advance quotes automatically based on reading-time estimate
	useEffect(() => {
		if (!showQuotes) return;
		const currentQuote = QUOTES[activeQuoteIndex] ?? "";
		const timer = window.setTimeout(() => {
			setActiveQuoteIndex(prev => (prev + 1) % QUOTES.length);
		}, estimateDisplayDurationMs(currentQuote));
		return () => window.clearTimeout(timer);
	}, [activeQuoteIndex, showQuotes]);

	useEffect(() => {
		if (!startedTranscriptionId) {
			reportOpeningRef.current = null;
		}
	}, [startedTranscriptionId]);

	useEffect(() => {
		if (!videoId) return;
		const latestPhaseEvent = sseEvents.find(event => isVideoUploadPhaseChangedEvent(event, videoId));
		if (!latestPhaseEvent) return;
		const eventKey = latestPhaseEvent.id ?? `${latestPhaseEvent.event}-${latestPhaseEvent.receivedAt}`;
		if (handledVideoPhaseEventsRef.current.has(eventKey)) return;
		handledVideoPhaseEventsRef.current.add(eventKey);

		const payload = parseVideoUploadPhaseChangedEvent(latestPhaseEvent);
		if (!payload) return;
		setLiveVideoPhase(payload.phase);

		if (payload.phase === "completed" || payload.phase === "failed") {
			void refetchPreview();
		}
	}, [sseEvents, videoId, refetchPreview]);

	// When a report-ready SSE arrives, fetch the report (to ensure it's available) and open the details page
	useEffect(() => {
		if (!startedTranscriptionId) return;
		if (completedTranscriptionId === startedTranscriptionId) return;
		if (reportOpeningRef.current === startedTranscriptionId) return;

		const readyEnvelope = sseEvents.find(event => isTranscriptionReportReadyEvent(event, startedTranscriptionId));
		const readyPayload = readyEnvelope ? parseTranscriptionReportReadyEvent(readyEnvelope) : null;
		if (!readyPayload || readyPayload.transcriptionId !== startedTranscriptionId) return;

		reportOpeningRef.current = startedTranscriptionId;
		let cancelled = false;

		const openTranscription = async () => {
			try {
				await interviewTranscriptionsReportApi.getTranscriptionReport({
					transcription_id: readyPayload.transcriptionId,
				});
				if (cancelled) return;
				setCompletedTranscriptionId(readyPayload.transcriptionId);
				toast.success("Транскрибация готова");
				navigate(`/interview-transcriptions/${readyPayload.transcriptionId}`);
			} catch (error) {
				if (cancelled) return;
				const description = error instanceof Error ? error.message : "Попробуйте открыть страницу транскрибации позже.";
				toast.error("Не удалось открыть транскрибацию", { description });
				setCompletedTranscriptionId(readyPayload.transcriptionId);
			}
		};

		void openTranscription();

		return () => {
			cancelled = true;
		};
	}, [sseEvents, startedTranscriptionId, completedTranscriptionId, navigate]);

	// Detect transcription completion via SSE
	useEffect(() => {
		if (!startedTranscriptionId) return;
		const match = sseEvents.find(event =>
			isTranscriptionCompletionEvent(event, startedTranscriptionId, startedVideoId),
		);
		if (match) setCompletedTranscriptionId(startedTranscriptionId);
	}, [sseEvents, startedTranscriptionId, startedVideoId]);

	return (
		<div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold">Загрузите интервью для транскрибации</h1>
				<p className="text-sm text-muted-foreground">
					Перетащите видео или выберите файл, укажите ключевые параметры и запустите транскрибацию.
				</p>
			</header>

			{isLimitReached && <UsageLimitReachedBanner exceededLimits={whichExceeded ?? []} />}

			<VideoDropZone
				disabled={isLimitReached}
				isUploading={isUploading}
				progressPct={progress.pct}
				uploadError={uploadError}
				uploadedVideo={uploadedVideo}
				uploadedVideoDetails={uploadedVideoDetails}
				previewError={previewError}
				livePhase={liveVideoPhase}
				onFileSelected={handleFileSelected}
			/>

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
				<InterviewDetailsForm
					speakerCount={speakerCount}
					onSpeakerCountChange={setSpeakerCount}
					interviewType={interviewType}
					onInterviewTypeChange={setInterviewType}
					canSubmit={canStart}
					isSubmitting={startTranscription.isPending}
					isAwaitingCompletion={isAwaitingCompletion}
					onSubmit={handleStartTranscription}
				/>
			)}

			{completedTranscriptionId && (
				<div className="flex justify-end">
					<Button variant="secondary" onClick={() => navigate(`/interview-transcriptions/${completedTranscriptionId}`)}>
						Открыть транскрибацию
					</Button>
				</div>
			)}
		</div>
	);
}
