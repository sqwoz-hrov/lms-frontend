import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { InterviewTranscriptionsApi, type InterviewTranscriptionResponseDto } from "@/api/interviewTranscriptionsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type InterviewTranscriptionMessage,
	useInterviewTranscriptionsStream,
} from "@/hooks/useInterviewTranscriptionsStream";
import { TranscriptionStatusBadge } from "@/components/interview-transcriptions/TranscriptionStatusBadge";

export default function InterviewTranscriptionDetailsPage() {
	const params = useParams<{ id: string }>();
	const transcriptionId = params.id ?? "";
	const queryClient = useQueryClient();
	const cachedList = queryClient.getQueryData<InterviewTranscriptionResponseDto[]>(["interview-transcriptions"]);
	const cachedItem = cachedList?.find(item => item.id === transcriptionId);

	const transcriptionQuery = useQuery({
		queryKey: ["interview-transcriptions", transcriptionId],
		enabled: Boolean(transcriptionId),
		queryFn: async () => {
			if (!transcriptionId) {
				throw new Error("Не указан идентификатор транскрибации");
			}
			return InterviewTranscriptionsApi.getById(transcriptionId);
		},
		initialData: cachedItem,
		refetchInterval: query => (query.state.data?.status === "done" ? false : 10_000),
	});

	const transcription = transcriptionQuery.data;
	const { messages } = useInterviewTranscriptionsStream();

	const chunks = useMemo(() => {
		if (!transcriptionId) return [];
		const filtered = messages.filter(msg => msg.transcriptionId === transcriptionId);
		const byIndex = new Map<number, InterviewTranscriptionMessage>();
		filtered.forEach(chunk => {
			byIndex.set(chunk.chunkIndex, chunk);
		});
		return Array.from(byIndex.values()).sort((a, b) => a.chunkIndex - b.chunkIndex);
	}, [messages, transcriptionId]);

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
					throw new Error("Не удалось загрузить файл транскрибации");
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
					setTextError(err instanceof Error ? err.message : "Ошибка загрузки транскрибации");
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

	const showChunks = Boolean(transcription && transcription.status !== "done");
	const showTypingIndicator = showChunks && chunks.length > 0;

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
								<CardTitle className="text-xl">
									Транскрибация <span className="font-mono text-base">{shortId(transcription.id)}</span>
								</CardTitle>
								<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
									<span>
										Создано:{" "}
										<span className="text-foreground">{new Date(transcription.created_at).toLocaleString()}</span>
									</span>
									{transcription.video_id && (
										<span>
											Видео: <span className="font-mono text-foreground">{transcription.video_id}</span>
										</span>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<TranscriptionStatusBadge status={transcription.status} />
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

					{showChunks ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Поточечная расшифровка</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{chunks.length === 0 ? (
									<div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
										Ожидаем первые чанки от сервера…
									</div>
								) : (
									chunks.map(chunk => <ChunkBubble key={chunk.chunkIndex} chunk={chunk} />)
								)}
								{showTypingIndicator && <TypingIndicator />}
							</CardContent>
						</Card>
					) : (
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
								) : fullText ? (
									<div className="rounded-lg border bg-card/50 p-4 text-sm leading-relaxed">
										<pre className="whitespace-pre-wrap font-sans">{fullText}</pre>
									</div>
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
					)}
				</>
			)}
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

function shortId(id: string) {
	if (id.length <= 12) return id;
	return `${id.slice(0, 6)}…${id.slice(-4)}`;
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
