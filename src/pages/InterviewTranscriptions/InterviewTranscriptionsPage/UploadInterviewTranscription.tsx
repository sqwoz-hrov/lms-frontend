import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InterviewTranscriptionsApi } from "@/api/interviewTranscriptionsApi";
import { VideosApi, type GetByIdVideoResponseDto } from "@/api/videosApi";
import { useResumableVideoUpload } from "@/hooks/useResumableVideoUpload";
import { Button } from "@/components/ui/button";
import { useSse } from "@/providers/SseProvider";
import { VideoDropZone } from "./components/BeforeUpload/VideoDropZone";
import { QuotesPanel } from "./components/AfterUpload/QuotesPanel";
import { InterviewDetailsForm, type InterviewType } from "./components/AfterUpload/InterviewDetailsForm";
import { QUOTES, estimateDisplayDurationMs, isTranscriptionCompletionEvent } from "./lib";

export default function UploadInterviewTranscriptionPage() {
	const navigate = useNavigate();
	const { events: sseEvents } = useSse();

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
	const canStart = Boolean(uploadedVideo?.id && interviewType);
	const isAwaitingCompletion = Boolean(startedTranscriptionId && !completedTranscriptionId);

	const handleFileSelected = useCallback(
		async (file: File) => {
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
		[startUpload],
	);

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

	// Advance quotes automatically based on reading-time estimate
	useEffect(() => {
		if (!showQuotes) return;
		const currentQuote = QUOTES[activeQuoteIndex] ?? "";
		const timer = window.setTimeout(() => {
			setActiveQuoteIndex(prev => (prev + 1) % QUOTES.length);
		}, estimateDisplayDurationMs(currentQuote));
		return () => window.clearTimeout(timer);
	}, [activeQuoteIndex, showQuotes]);

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

			<VideoDropZone
				isUploading={isUploading}
				progressPct={progress.pct}
				uploadError={uploadError}
				uploadedVideo={uploadedVideo}
				uploadedVideoDetails={uploadedVideoDetails}
				isFetchingPreview={isFetchingPreview}
				previewError={previewError}
				onRefetchPreview={refetchPreview}
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
					<Button
						variant="secondary"
						onClick={() => navigate(`/interview-transcriptions/${completedTranscriptionId}`)}
					>
						Открыть транскрибацию
					</Button>
				</div>
			)}
		</div>
	);
}
