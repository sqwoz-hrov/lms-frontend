import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, RefreshCcw } from "lucide-react";
import { InterviewTranscriptionsApi } from "@/api/interviewTranscriptionsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TranscriptionStatusBadge } from "@/components/interview-transcriptions/TranscriptionStatusBadge";

export default function InterviewTranscriptionsPage() {
	const transcriptionsQuery = useQuery({
		queryKey: ["interview-transcriptions"],
		queryFn: () => InterviewTranscriptionsApi.list(),
	});

	const transcriptions = transcriptionsQuery.data ?? [];
	const isFetching = transcriptionsQuery.isFetching;
	const isLoading = transcriptionsQuery.isLoading;

	return (
		<div className="mx-auto w-full max-w-5xl space-y-4 p-4">
			<header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Транскрибации интервью</h1>
					<p className="text-sm text-muted-foreground">
						Здесь собраны все запущенные транскрибации. Выберите нужную, чтобы просмотреть ход расшифровки.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => transcriptionsQuery.refetch()} disabled={isFetching}>
					{isFetching ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
					Обновить
				</Button>
			</header>

			{transcriptionsQuery.isError ? (
				<Card>
					<CardContent className="py-6 text-sm text-destructive">
						Не удалось загрузить список транскрибаций. Попробуйте обновить страницу.
					</CardContent>
				</Card>
			) : null}

			{isLoading ? (
				<Card>
					<CardContent className="flex flex-col gap-4 py-6">
						{Array.from({ length: 3 }).map((_, idx) => (
							<div key={idx} className="h-6 w-full animate-pulse rounded bg-muted/70" />
						))}
					</CardContent>
				</Card>
			) : transcriptions.length === 0 ? (
				<Card>
					<CardContent className="py-6 text-sm text-muted-foreground">
						Вы пока не запускали транскрибации. Как только начнётся первая запись, она появится здесь.
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Список транскрибаций</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID</TableHead>
									<TableHead>Видео</TableHead>
									<TableHead>Статус</TableHead>
									<TableHead>Создано</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{transcriptions.map(item => (
									<TableRow key={item.id}>
										<TableCell className="font-mono text-xs sm:text-sm">{shortId(item.id)}</TableCell>
										<TableCell className="font-mono text-xs sm:text-sm">{item.video_id ?? "—"}</TableCell>
										<TableCell>
											<TranscriptionStatusBadge status={item.status} />
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{new Date(item.created_at).toLocaleString()}
										</TableCell>
										<TableCell className="text-right">
											<Button asChild size="sm" variant="outline">
												<Link to={`/interview-transcriptions/${item.id}`}>Открыть</Link>
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function shortId(id: string) {
	if (id.length <= 12) return id;
	return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
