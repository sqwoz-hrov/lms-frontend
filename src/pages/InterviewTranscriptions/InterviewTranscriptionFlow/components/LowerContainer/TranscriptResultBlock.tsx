import { useState, useEffect, useMemo } from "react";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterviewTranscriptionsApi, type InterviewTranscriptionResponseDto } from "@/api/interviewTranscriptionsApi";
import { useInterviewTranscriptionsStream, type InterviewTranscriptionMessage } from "@/hooks/useInterviewTranscriptionsStream";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

// Mock mode flag - set to true for testing without backend
const MOCK_MODE = true;

// Mock transcription data for testing
const MOCK_TRANSCRIPTION: InterviewTranscriptionResponseDto = {
	id: "mock-transcription-1",
	video_id: "mock-video-1",
	status: "done",
	s3_transcription_key: null,
	transcription_url: null,
	created_at: new Date().toISOString(),
};

const MOCK_TRANSCRIPTION_TEXT = `
1
00:00:00,000 --> 00:00:00,900
[SPEAKER_00] Привет.

2
00:00:00,900 --> 00:00:02,100
[SPEAKER_02] Да, привет, привет.

3
00:00:02,100 --> 00:00:05,800
[SPEAKER_00] Как, слышно, видно меня?

4
00:00:05,800 --> 00:00:12,400
[SPEAKER_03] Слышно нормально, чуть-чуть подлагивает звук,
но я думаю, что это просто сама сеть.

5
00:00:12,400 --> 00:00:14,200
[SPEAKER_03] По-моему, нормально будет.

6
00:00:14,200 --> 00:00:15,000
[SPEAKER_00] Хорошо.

7
00:00:15,000 --> 00:00:18,500
[SPEAKER_00] Так, давай знакомиться.

8
00:00:18,500 --> 00:00:22,300
[SPEAKER_00] Меня зовут Чел, я техлид компании "ебаный бобаный".

9
00:00:22,300 --> 00:00:26,100
[SPEAKER_00] Если не против, перейдём на ты сразу.

10
00:00:26,100 --> 00:00:27,000
[SPEAKER_03] Давай, давай.

11
00:00:27,000 --> 00:00:28,200
[SPEAKER_00] Супер.

12
00:00:28,200 --> 00:00:34,800
[SPEAKER_00] Расскажи, Чувак, про свой последний опыт.

13
00:00:34,800 --> 00:00:45,200
[SPEAKER_03] Получается, чуть больше полугода,
восемь месяцев я лидил разработку платформы Сквозь Эйчаров.

14
00:00:45,200 --> 00:00:51,900
[SPEAKER_03] Это включало в себя всё — от архитектуры
до каких-то рядовых задач.

15
00:00:51,900 --> 00:00:57,500
[SPEAKER_03] Ну и плюс мы туда мультитенантность завезли.

16
00:00:57,500 --> 00:01:02,200
[SPEAKER_03] Пока что не целиком, но потихоньку дело движется.
`;

const MOCK_SUMMARY_TEXT = `
## Результат анализа

### Участники
- **Интервьюер** — Чел, техлид компании
- **Кандидат** — Чувак

### Заваленные секции
- Архитектура платформы
- Мультитенантность

### Что стоит подучить
- Архитектура микросервисов
- Основы DevOps
- Работа с облачными решениями

### Общее впечатление
Кандидат уверенно рассказывает о своём опыте, демонстрирует понимание как высокоуровневых задач (архитектура), так и готовность работать с рядовыми задачами.
`;


type ViewMode = "summary" | "detailed";

type TranscriptResultBlockProps = {
	/** Video ID to fetch transcription for */
	videoId?: string;
	/** Transcription ID to fetch directly */
	transcriptionId?: string;
};

export function TranscriptResultBlock({ videoId, transcriptionId }: TranscriptResultBlockProps) {
	const [transcription, setTranscription] = useState<InterviewTranscriptionResponseDto | null>(null);
	const [fullText, setFullText] = useState<string | null>(null);
	const [summaryText, setSummaryText] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("summary");

	const { messages } = useInterviewTranscriptionsStream();

	// Filter chunks for this transcription
	const chunks = useMemo(() => {
		if (!transcriptionId && !transcription?.id) return [];
		const targetId = transcriptionId ?? transcription?.id;
		
		const filtered = messages.filter(msg => msg.transcriptionId === targetId);
		const byIndex = new Map<number, InterviewTranscriptionMessage>();
		filtered.forEach(chunk => {
			byIndex.set(chunk.chunkIndex, chunk);
		});
		return Array.from(byIndex.values()).sort((a, b) => a.chunkIndex - b.chunkIndex);
	}, [messages, transcriptionId, transcription?.id]);

	// Fetch transcription data
	useEffect(() => {
		let disposed = false;

		async function fetchTranscription() {
			setLoading(true);
			setError(null);

			try {
				if (MOCK_MODE) {
					// Simulate network delay
					await new Promise(resolve => setTimeout(resolve, 500));
					if (disposed) return;
					
					setTranscription(MOCK_TRANSCRIPTION);
					setFullText(MOCK_TRANSCRIPTION_TEXT);
					setSummaryText(MOCK_SUMMARY_TEXT);
					return;
				}

				let data: InterviewTranscriptionResponseDto;
				
				if (transcriptionId) {
					data = await InterviewTranscriptionsApi.getById(transcriptionId);
				} else if (videoId) {
					data = await InterviewTranscriptionsApi.getByVideoId(videoId);
				} else {
					throw new Error("Не указан идентификатор видео или транскрипции");
				}

				if (disposed) return;
				setTranscription(data);

				// Fetch full text if available
				if (data.status === "done" && data.transcription_url) {
					const response = await fetch(data.transcription_url);
					if (!response.ok) {
						throw new Error("Не удалось загрузить файл транскрипции");
					}
					const text = await response.text();
					if (!disposed) {
						setFullText(text);
					}
				}
			} catch (err) {
				if (!disposed) {
					setError(err instanceof Error ? err.message : "Ошибка загрузки транскрипции");
				}
			} finally {
				if (!disposed) {
					setLoading(false);
				}
			}
		}

		fetchTranscription();

		return () => {
			disposed = true;
		};
	}, [videoId, transcriptionId]);

	const handleCopy = async () => {
		if (!fullText) return;
		
		try {
			await navigator.clipboard.writeText(fullText);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = fullText;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center gap-3 py-12">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
				<span className="text-lg text-muted-foreground">Загружаем транскрипцию...</span>
			</div>
		);
	}

	if (error) {
		return (
			<Card className="border-destructive/50">
				<CardContent className="flex items-center gap-3 py-6">
					<AlertCircle className="h-5 w-5 text-destructive" />
					<span className="text-destructive">{error}</span>
				</CardContent>
			</Card>
		);
	}

	if (!transcription) {
		return (
			<Card>
				<CardContent className="py-6 text-muted-foreground">
					Транскрипция не найдена
				</CardContent>
			</Card>
		);
	}

    // TODO: handle this better smh
	// Show streaming chunks if transcription is still processing
	if (transcription.status !== "done" && chunks.length > 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Поточная расшифровка</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{chunks.map(chunk => (
						<ChunkBubble key={chunk.chunkIndex} chunk={chunk} />
					))}
					<TypingIndicator />
				</CardContent>
			</Card>
		);
	}

	// Show full transcription
	const displayText = viewMode === "summary" ? summaryText : fullText;
	const copyText = viewMode === "summary" ? summaryText : fullText;

	return (
		<Card>
			<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
						<TabsList className="h-9">
							<TabsTrigger value="summary" className="text-sm px-3">
								Кратко
							</TabsTrigger>
							<TabsTrigger value="detailed" className="text-sm px-3">
								Подробно
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button
						variant="outline"
						size="sm"
						onClick={handleCopy}
						disabled={!copyText}
					>
						{copied ? (
							<>
								<Check className="h-4 w-4 mr-1" />
								Скопировано
							</>
						) : (
							<>
								<Copy className="h-4 w-4 mr-1" />
								Копировать
							</>
						)}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{displayText ? (
					<article className="prose prose-sm max-w-none dark:prose-invert">
						<MarkdownRenderer markdown={displayText} />
					</article>
				) : (
					<p className="text-muted-foreground">
						{viewMode === "summary" 
							? "Краткое содержание пока недоступно" 
							: "Транскрипция пока пуста или недоступна"}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function ChunkBubble({ chunk }: { chunk: InterviewTranscriptionMessage }) {
	return (
		<div className="rounded-xl border bg-card px-4 py-3">
			<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				{chunk.speakerLabel && (
					<span className="font-medium text-foreground">{chunk.speakerLabel}</span>
				)}
				<span>
					{formatTime(chunk.startTimeSec)} – {formatTime(chunk.endTimeSec)}
				</span>
				<span className="font-mono text-[11px] text-muted-foreground/70">
					#{chunk.chunkIndex}
				</span>
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
