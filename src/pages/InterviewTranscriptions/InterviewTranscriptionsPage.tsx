import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, RefreshCcw } from "lucide-react";
import { InterviewTranscriptionsApi, type InterviewTranscriptionResponseDto } from "@/api/interviewTranscriptionsApi";
import type { UserResponse } from "@/api/usersApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TranscriptionStatusBadge } from "@/components/interview-transcriptions/TranscriptionStatusBadge";
import { usePermissions } from "@/hooks/usePermissions";
import { UsersLoader, useUsersLoader } from "@/components/users/UsersLoader";
import { UserSelectFilter } from "@/components/users/UserSelectFilter";
import { useUsersById } from "@/hooks/useUsersById";
import { describeVideoPhase, formatDateTime, formatFileSizeFromString } from "./utils";

export default function InterviewTranscriptionsPage() {
	const { isAdmin } = usePermissions();
	return (
		<UsersLoader roles={["user", "admin"]} enabled={isAdmin}>
			<InterviewTranscriptionsPageContent isAdmin={isAdmin} />
		</UsersLoader>
	);
}

type InterviewTranscriptionsPageContentProps = {
	isAdmin: boolean;
};

function InterviewTranscriptionsPageContent({ isAdmin }: InterviewTranscriptionsPageContentProps) {
	const [searchParams, setSearchParams] = useSearchParams();
	const selectedUserId = isAdmin ? (searchParams.get("user_id") ?? undefined) : undefined;

	const scope = isAdmin ? "admin" : "self";
	const transcriptionsQuery = useQuery({
		queryKey: ["interview-transcriptions", { scope, user_id: selectedUserId ?? null }],
		queryFn: () => InterviewTranscriptionsApi.list(selectedUserId ? { user_id: selectedUserId } : undefined),
	});

	const transcriptions = transcriptionsQuery.data ?? [];
	const isFetching = transcriptionsQuery.isFetching;
	const isLoading = transcriptionsQuery.isLoading;

	const { users } = useUsersLoader();
	const usersById = useUsersById(users);

	const handleUserFilterChange = (next?: string) => {
		if (!isAdmin) return;
		const params = new URLSearchParams(searchParams);
		if (next) params.set("user_id", next);
		else params.delete("user_id");
		setSearchParams(params, { replace: true });
	};

	const resetFilters = () => handleUserFilterChange(undefined);

	return (
		<div className="mx-auto w-full max-w-5xl space-y-4 p-4">
			<header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Транскрибации интервью</h1>
					<p className="text-sm text-muted-foreground">
						Следите за прогрессом и находите нужную запись по имени видео.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => transcriptionsQuery.refetch()} disabled={isFetching}>
					{isFetching ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
					Обновить
				</Button>
			</header>

			{isAdmin && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Фильтры</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-[minmax(0,280px)_auto]">
						<UserSelectFilter
							label="Пользователь"
							value={selectedUserId}
							onChange={handleUserFilterChange}
							allLabel="Все пользователи"
							allowedRoles={["user", "admin"]}
						/>
						<div className="flex items-end">
							<Button variant="outline" onClick={resetFilters} disabled={!selectedUserId}>
								Сбросить
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{transcriptionsQuery.isError ? (
				<Card>
					<CardContent className="py-6 text-sm text-destructive">
						Не удалось загрузить список транскрибаций. Попробуйте обновить страницу.
					</CardContent>
				</Card>
			) : isLoading ? (
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
						{selectedUserId
							? "Для выбранного пользователя пока нет транскрибаций."
							: "Вы пока не запускали транскрибации."}
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
									<TableHead>Видео</TableHead>
									<TableHead>Статус</TableHead>
									<TableHead>Создано</TableHead>
									<TableHead className="text-right" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{transcriptions.map(item => (
									<TableRow key={item.id}>
										<TableCell className="align-top">
											<VideoCell item={item} showOwner={isAdmin} usersById={usersById} />
										</TableCell>
										<TableCell className="align-top">
											<TranscriptionStatusBadge status={item.status} />
										</TableCell>
										<TableCell className="align-top text-sm text-muted-foreground">
											{formatDateTime(item.created_at)}
										</TableCell>
										<TableCell className="text-right align-top">
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

type VideoCellProps = {
	item: InterviewTranscriptionResponseDto;
	showOwner: boolean;
	usersById: Map<string, UserResponse>;
};

function VideoCell({ item, showOwner, usersById }: VideoCellProps) {
	const video = item.video;
	const ownerName = useMemo(() => {
		if (!video?.user_id || !showOwner) return null;
		const user = usersById.get(video.user_id);
		if (!user) return null;
		return user.telegram_username ? `${user.name} (@${user.telegram_username})` : user.name;
	}, [video?.user_id, usersById, showOwner]);

	const sizeLabel = formatFileSizeFromString(video?.total_size);
	const metaParts = [
		showOwner ? `Пользователь: ${ownerName ?? "неизвестно"}` : null,
		video?.phase ? `Загрузка: ${describeVideoPhase(video.phase)}` : null,
		sizeLabel ? `Размер: ${sizeLabel}` : null,
	].filter(Boolean);

	return (
		<div className="space-y-1">
			<div className="font-medium">{video?.filename ?? "Без названия"}</div>
			{metaParts.length > 0 && <div className="text-xs text-muted-foreground">{metaParts.join(" • ")}</div>}
		</div>
	);
}
