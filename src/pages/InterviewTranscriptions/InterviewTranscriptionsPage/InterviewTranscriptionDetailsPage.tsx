import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { interviewTranscriptionsReportApi } from "@/api/interviewTranscriptionsReportApi";
import { VideoPlayer } from "@/components/video/VideoPlayer";

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

export default function InterviewTranscriptionDetailsPage() {
	const params = useParams<{ id: string }>();
	const transcriptionId = params.id ?? "";
	const queryClient = useQueryClient();
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
						<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-2">
								<CardTitle className="text-xl">{transcription.video?.filename ?? "Транскрибация интервью"}</CardTitle>
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
						</CardHeader>
					</Card>

					<VideoDetailsCard video={transcription.video} />

					<Card>
						<CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3">
							<CardTitle className="text-lg">Видео</CardTitle>
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
									<AnalysisSection reportId={transcription.id} transcriptionReport={transcriptionReport} />
									<div className="rounded-lg border bg-card/50 p-4 text-sm leading-relaxed">
										<pre className="whitespace-pre-wrap font-sans">{fullText}</pre>
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
				</>
			)}
		</div>
	);
}

function AnalysisSection({ reportId, transcriptionReport }: { reportId: string; transcriptionReport: any }) {

	return (<Card>
		<CardHeader>
			<CardTitle className="text-lg">Анализ расшифровки</CardTitle>
		</CardHeader>
		<CardContent>
			<div className="rounded-lg border bg-card/50 p-4 text-sm leading-relaxed">
				<p>{JSON.stringify(transcriptionReport)}</p>
			</div>
		</CardContent>
	</Card>)
}

function VideoDetailsCard({ video }: { video?: VideoResponseDto | null }) {
	const sizeLabel = formatFileSizeFromString(video?.total_size) ?? "—";
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Детали видео</CardTitle>
			</CardHeader>
			<CardContent>
				<dl className="grid gap-4 sm:grid-cols-2">
					<InfoRow label="Имя файла" value={video?.filename ?? "Без названия"} />
					<InfoRow label="Статус загрузки" value={describeVideoPhase(video?.phase)} />
					<InfoRow label="Размер" value={sizeLabel} />
					<InfoRow label="MIME-тип" value={video?.mime_type ?? "—"} />
					<InfoRow label="Загружено" value={video?.created_at ? formatDateTime(video.created_at) : "—"} />
				</dl>
			</CardContent>
		</Card>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
			<dd className="text-sm text-foreground">{value}</dd>
		</div>
	);
}

function ChunkBubble({ chunk }: { chunk: InterviewTranscriptionMessage }) {
	return (
		<div className="rounded-xl border bg-card px-4 py-3">
			<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				{chunk.speakerLabel && <span className="font-medium text-foreground">{chunk.speakerLabel}</span>}
				<span>
					{formatTime(chunk.startTimeSec)} – {formatTime(chunk.endTimeSec)}
				</span>
				<span className="font-mono text-[11px] text-muted-foreground/70">#{chunk.chunkIndex}</span>
			</div>
			<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{chunk.text}</p>
		</div>
	);
}

function TypingIndicator() {
	return (
		<div className="inline-flex items-center gap-1 rounded-full border bg-muted px-4 py-2">
			{[0, 1, 2].map(idx => (
				<span
					key={idx}
					className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
					style={{ animationDelay: `${idx * 0.15}s` }}
				/>
			))}
		</div>
	);
}

function formatTime(seconds: number) {
	if (!Number.isFinite(seconds)) return "—";
	const mins = Math.floor(seconds / 60)
		.toString()
		.padStart(2, "0");
	const secs = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0");
	return `${mins}:${secs}`;
}
