// src/components/hr/interviews/InterviewsSection.tsx
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { InterviewApi, type BaseInterviewDto } from "@/api/interviewsApi"; // ← singular: interviewApi
import { GetByIdVideoResponseDto, VideosApi } from "@/api/videosApi"; // ← тип унифицировали на GetByIdVideoResponseDto
import { InterviewTranscriptionsApi } from "@/api/interviewTranscriptionsApi";
import { ConfirmDeletionDialog } from "@/components/common/dialogs/ConfirmDeletionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { usePermissions } from "@/hooks/usePermissions";
import { useResumableVideoUpload } from "@/hooks/useResumableVideoUpload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Captions, Loader2, Pause, Play, Plus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { InterviewFormDialog } from "./InterviewFormDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/** Нормализуем backend-статусы к фазам плеера */
function toPlayerPhase(p?: string): NonNullable<React.ComponentProps<typeof VideoPlayer>["phase"]> {
	switch (p) {
		case "receiving":
		case "hashing":
		case "uploading_s3":
		case "completed":
		case "failed":
			return p;
		// На случай старого "processing"
		case "processing":
			return "uploading_s3";
		default:
			return "receiving";
	}
}

function VideoPreview({ video, onRefresh }: { video: GetByIdVideoResponseDto; onRefresh?: () => void }) {
	const phase = toPlayerPhase(video.phase);

	return (
		<div className="w-full max-w-xl">
			<VideoPlayer
				src={video.video_url}
				type={video.mime_type ?? "video/mp4"}
				title={video.filename ?? "Video"}
				phase={phase}
			/>
			<div className="mt-2 flex items-center justify-between gap-2">
				<div className="text-xs text-muted-foreground truncate">{video.filename ?? "video"}</div>
				{onRefresh && phase !== "completed" && (
					<Button size="sm" variant="secondary" onClick={onRefresh}>
						Обновить
					</Button>
				)}
			</div>
		</div>
	);
}

function VideoAttach({ interview, onAttached }: { interview: BaseInterviewDto; onAttached: () => void }) {
	const fileRef = useRef<HTMLInputElement | null>(null);

	const {
		start: startUpload,
		pause: pauseUpload,
		resume: resumeUpload,
		cancel: cancelUpload,
		status: uploadStatus,
		progress: uploadProgress, // { sent, total, pct }
		error: uploadError,
	} = useResumableVideoUpload();

	const [updating, setUpdating] = useState(false);

	const isUploading = uploadStatus === "uploading";
	const isPaused = uploadStatus === "paused";
	const isBusy = isUploading || isPaused || updating;
	const pct = uploadProgress.pct;

	function handlePick() {
		fileRef.current?.click();
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const uploaded = await startUpload(file);
			const videoId = uploaded?.id;
			if (!videoId) throw new Error("Upload did not return a video id");

			setUpdating(true);
			await InterviewApi.update({ id: interview.id, video_id: videoId });
			onAttached();
		} catch (err) {
			console.error(err);
		} finally {
			setUpdating(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	return (
		<div className="flex items-center gap-2">
			<input
				ref={fileRef}
				type="file"
				accept="video/*"
				className="hidden"
				onChange={handleFileChange}
				disabled={isBusy}
			/>

			{interview.video_id ? (
				<Button variant="outline" size="sm" onClick={handlePick} disabled={isBusy}>
					{isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />} Заменить видео
				</Button>
			) : (
				<Button variant="outline" size="sm" onClick={handlePick} disabled={isBusy}>
					{isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />} Загрузить видео
				</Button>
			)}

			{(isUploading || isPaused) && (
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{pct}%</span>
					{isUploading ? (
						<Button type="button" size="sm" variant="ghost" onClick={pauseUpload}>
							<Pause className="mr-1 h-3 w-3" /> Пауза
						</Button>
					) : (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => {
								const file = fileRef.current?.files?.[0];
								if (file) resumeUpload(file);
							}}
						>
							<Play className="mr-1 h-3 w-3" /> Продолжить
						</Button>
					)}
					<Button type="button" size="sm" variant="ghost" onClick={cancelUpload}>
						<X className="mr-1 h-3 w-3" /> Отмена
					</Button>
				</div>
			)}

			{uploadStatus === "error" && (
				<div className="text-xs text-red-600">Ошибка загрузки: {uploadError ?? "Неизвестная ошибка"}</div>
			)}
		</div>
	);
}

export function InterviewsSection({ hrConnection }: { hrConnection: BaseHrConnectionDto }) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const { canCRUDInterview, isAdmin } = usePermissions();
	const canCrud = canCRUDInterview(hrConnection);

	const q = useQuery<BaseInterviewDto[]>({
		queryKey: ["interviews", { hr_connection_id: hrConnection.id }],
		queryFn: () => InterviewApi.list({ hr_connection_id: hrConnection.id }),
	});

	const [open, setOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [pendingTranscriptionInterviewId, setPendingTranscriptionInterviewId] = useState<string | null>(null);

	const del = useMutation({
		mutationFn: async (id: string) => InterviewApi.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["interviews", { hr_connection_id: hrConnection.id }] });
			setDeleteTargetId(null);
		},
	});

	const startTranscriptionMutation = useMutation({
		mutationFn: (videoId: string) => InterviewTranscriptionsApi.start({ video_id: videoId }),
	});

	// Сопутствующая загрузка метаданных видео по присутствующим video_id
	const videoIds = useMemo(() => (q.data?.map(i => i.video_id).filter(Boolean) as string[]) || [], [q.data]);
	const videosQ = useQuery<{ [id: string]: GetByIdVideoResponseDto }>({
		queryKey: ["videos-map", { ids: videoIds }],
		queryFn: async () => {
			const results = await Promise.all(videoIds.map(id => VideosApi.getById(id)));
			return Object.fromEntries(results.map(v => [v.id, v]));
		},
		enabled: videoIds.length > 0,
	});

	if (q.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<Loader2 className="size-4 animate-spin" /> Загрузка интервью…
			</div>
		);
	}

	async function handleStartTranscription(interview: BaseInterviewDto) {
		if (!interview.video_id) {
			toast.error("У интервью нет видео для транскрибации");
			return;
		}

		try {
			setPendingTranscriptionInterviewId(interview.id);
			const result = await startTranscriptionMutation.mutateAsync(interview.video_id);
			toast.success("Транскрибация запущена", {
				description: `ID запроса: ${result.id}`,
				action: {
					label: "Мониторинг",
					onClick: () => navigate("/interview-transcriptions"),
				},
			});
		} catch (error) {
			const description =
				error instanceof Error ? error.message : "Не удалось запустить транскрибацию. Проверьте консоль.";
			toast.error("Ошибка запуска транскрибации", { description });
		} finally {
			setPendingTranscriptionInterviewId(null);
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex justify-between items-center">
				<h3 className="font-medium">Интервью</h3>
				{canCrud && (
					<Button size="sm" onClick={() => setOpen(true)}>
						<Plus className="size-4 mr-2" /> Добавить
					</Button>
				)}
			</div>

			{q.data && q.data.length > 0 ? (
				<div className="grid gap-3">
					{q.data.map(it => {
						const video = it.video_id ? videosQ.data?.[it.video_id] : undefined;
						return (
							<Card key={it.id}>
								<CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
									<div className="text-sm min-w-0">
										<div className="font-medium truncate">{it.name}</div>
										<div className="text-muted-foreground">
											{it.type} • {new Date(it.created_at).toLocaleString()}
										</div>
										{video ? (
											<div className="mt-3">
												<VideoPreview video={video} onRefresh={() => videosQ.refetch()} />
											</div>
										) : (
											<div className="mt-3 text-xs text-muted-foreground">Видео не прикреплено.</div>
										)}
									</div>

									<div className="flex items-center gap-2 md:self-start flex-wrap">
										{canCrud && (
											<VideoAttach
												interview={it}
												onAttached={() =>
													qc.invalidateQueries({ queryKey: ["interviews", { hr_connection_id: hrConnection.id }] })
												}
											/>
										)}
										{isAdmin && it.video_id && (
											<Button
												variant="secondary"
												size="sm"
												onClick={() => handleStartTranscription(it)}
												disabled={startTranscriptionMutation.isPending && pendingTranscriptionInterviewId === it.id}
											>
												{startTranscriptionMutation.isPending && pendingTranscriptionInterviewId === it.id ? (
													<Loader2 className="mr-2 size-4 animate-spin" />
												) : (
													<Captions className="mr-2 size-4" />
												)}
												Транскрибация
											</Button>
										)}
										{canCrud && (
											<Button
												variant="destructive"
												size="sm"
												onClick={() => setDeleteTargetId(it.id)}
												disabled={del.isPending}
											>
												<Trash2 className="size-4 mr-2" /> Удалить
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : (
				<div className="text-sm text-muted-foreground">Интервью пока нет.</div>
			)}

			<InterviewFormDialog open={open} onOpenChange={setOpen} hrConnection={hrConnection} />
			<ConfirmDeletionDialog
				entityName="интервью"
				open={Boolean(deleteTargetId)}
				onOpenChange={next => {
					if (!next) setDeleteTargetId(null);
				}}
				onConfirm={() => {
					if (!deleteTargetId) return;
					del.mutate(deleteTargetId);
				}}
				pending={del.isPending}
				description="Интервью будет удалено без возможности восстановления."
			/>
		</div>
	);
}
