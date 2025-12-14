import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type InterviewTranscriptionMessage,
	useInterviewTranscriptionsStream,
} from "@/hooks/useInterviewTranscriptionsStream";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export default function InterviewTranscriptionsPage() {
	const { status, lastError, reconnect, messages } = useInterviewTranscriptionsStream();

	const groups = useMemo(() => groupByTranscription(messages), [messages]);

	const statusBadge = mapStatus(status);

	return (
		<div className="mx-auto w-full max-w-5xl space-y-4 p-4">
			<header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Транскрибации интервью</h1>
					<p className="text-sm text-muted-foreground">
						После запуска потока первые сообщения могут прийти только через 5-10 минут.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
					<Button variant="outline" size="sm" onClick={reconnect}>
						Переподключить
					</Button>
				</div>
			</header>

			{lastError && <p className="text-sm text-destructive">{lastError}</p>}

			{groups.length === 0 ? (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						Пока нет сообщений от сервера. Запустите транскрибацию в откликах и дождитесь появления чанков.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{groups.map(group => (
						<Card key={group.id}>
							<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div>
									<CardTitle className="text-lg">
										Транскрибация{" "}
										<span className="font-mono text-base">{group.id === "unknown" ? "без id" : group.id}</span>
									</CardTitle>
									<p className="text-xs text-muted-foreground">
										Получено {group.messages.length} сообщ{pluralSuffix(group.messages.length)}
									</p>
								</div>
								<div className="text-xs text-muted-foreground">
									Последнее обновление: {new Date(group.latest).toLocaleString()}
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								{group.messages.map(message => (
									<div
										key={`${message.receivedAt}-${message.event}-${message.id ?? "raw"}`}
										className="rounded-md border p-3"
									>
										<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
											<Badge variant={message.event.includes("error") ? "destructive" : "secondary"}>
												{message.event}
											</Badge>
											<span>{new Date(message.receivedAt).toLocaleString()}</span>
											{message.transcriptionId && (
												<span className="font-mono text-[11px] text-muted-foreground/80">
													ID: {message.transcriptionId}
												</span>
											)}
										</div>
										{message.text && (
											<p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{message.text}</p>
										)}
										<details className="mt-2 text-xs">
											<summary className="cursor-pointer text-muted-foreground">Полные данные</summary>
											<pre className={cn("mt-2 overflow-x-auto rounded bg-muted p-2 text-[11px] leading-tight")}>
												{JSON.stringify(message.payload ?? message.raw.data, null, 2)}
											</pre>
										</details>
									</div>
								))}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

function groupByTranscription(messages: InterviewTranscriptionMessage[]) {
	const map = new Map<string, InterviewTranscriptionMessage[]>();

	messages.forEach(msg => {
		const key = msg.transcriptionId ?? "unknown";
		const bucket = map.get(key) ?? [];
		bucket.push(msg);
		map.set(key, bucket);
	});

	return Array.from(map.entries())
		.map(([id, bucket]) => ({
			id,
			messages: bucket.sort((a, b) => a.receivedAt - b.receivedAt),
			latest: bucket[bucket.length - 1]?.receivedAt ?? 0,
		}))
		.sort((a, b) => b.latest - a.latest);
}

function pluralSuffix(count: number) {
	const units = count % 10;
	const tens = Math.floor((count % 100) / 10);

	if (tens === 1) return "ений";
	if (units === 1) return "ение";
	if (units >= 2 && units <= 4) return "ения";
	return "ений";
}

function mapStatus(status: "idle" | "connecting" | "open" | "error") {
	switch (status) {
		case "open":
			return { label: "Подключено", variant: "secondary" as const };
		case "connecting":
			return { label: "Подключаемся…", variant: "outline" as const };
		case "error":
			return { label: "Ошибка", variant: "destructive" as const };
		default:
			return { label: "Неактивно", variant: "outline" as const };
	}
}
