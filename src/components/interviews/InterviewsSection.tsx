// src/components/hr/interviews/InterviewsSection.tsx
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { InterviewApi, type BaseInterviewDto } from "@/api/interviewsApi"; // ← singular: interviewApi
import { VideosApi, type VideoResponseDto } from "@/api/videosApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { InterviewFormDialog } from "./InterviewFormDialog";

function extractYouTubeId(youtube_link: string | undefined): string | null {
	if (!youtube_link) return null;
	try {
		const u = new URL(youtube_link);
		if (u.hostname.includes("youtu.be")) {
			return u.pathname.slice(1) || null;
		}
		if (u.hostname.includes("youtube.com")) {
			if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
			if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
			if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
		}
	} catch {
		console.log("failed to extract youtube video id");
	}
	return null;
}

function VideoPreview({ video }: { video: VideoResponseDto }) {
	const ytId = extractYouTubeId(video.youtube_link);
	if (ytId) {
		return (
			<div className="w-full max-w-xl">
				<div className="aspect-video rounded-lg overflow-hidden border">
					<iframe
						className="w-full h-full"
						src={`https://www.youtube.com/embed/${ytId}`}
						title={video.original_name}
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
					/>
				</div>
				<div className="mt-2 text-xs text-muted-foreground truncate">{video.original_name}</div>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2">
			<Button asChild size="sm">
				<a href={video.youtube_link} target="_blank" rel="noreferrer">
					<Play className="size-4 mr-2" /> Смотреть видео
				</a>
			</Button>
			<span className="text-xs text-muted-foreground truncate max-w-[320px]">{video.original_name}</span>
		</div>
	);
}

function VideoAttach({ interview, onAttached }: { interview: BaseInterviewDto; onAttached: () => void }) {
	const fileRef = useRef<HTMLInputElement | null>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [busy, setBusy] = useState(false);

	function handlePick() {
		fileRef.current?.click();
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setBusy(true);
		try {
			const uploaded = await VideosApi.upload(file, {
				onUploadProgress: evt => {
					if (!evt.total) return;
					setProgress(Math.round((evt.loaded / evt.total) * 100));
				},
			});
			await InterviewApi.update({ id: interview.id, video_id: uploaded.id });
			onAttached();
		} finally {
			setBusy(false);
			setProgress(null);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	return (
		<div className="flex items-center gap-2">
			<input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
			<Button variant="outline" size="sm" onClick={handlePick} disabled={busy}>
				{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}{" "}
				{interview.video_id ? "Заменить видео" : "Загрузить видео"}
			</Button>
			{typeof progress === "number" && <span className="text-xs text-muted-foreground">{progress}%</span>}
		</div>
	);
}

export function InterviewsSection({ hrConnection }: { hrConnection: BaseHrConnectionDto }) {
	const qc = useQueryClient();
	const { canCRUDInterview } = usePermissions();
	const canCrud = canCRUDInterview(hrConnection);

	const q = useQuery<BaseInterviewDto[]>({
		queryKey: ["interviews", { hr_connection_id: hrConnection.id }],
		queryFn: () => InterviewApi.list({ hr_connection_id: hrConnection.id }),
	});

	const [open, setOpen] = useState(false);

	const del = useMutation({
		mutationFn: async (id: string) => InterviewApi.remove(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["interviews", { hr_connection_id: hrConnection.id }] }),
	});

	// Сопутствующая загрузка метаданных видео по присутствующим video_id
	const videoIds = useMemo(() => (q.data?.map(i => i.video_id).filter(Boolean) as string[]) || [], [q.data]);
	const videosQ = useQuery<{ [id: string]: VideoResponseDto }>({
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
												<VideoPreview video={video} />
											</div>
										) : (
											<div className="mt-3 text-xs text-muted-foreground">Видео не прикреплено.</div>
										)}
									</div>

									<div className="flex items-center gap-2 md:self-start">
										{canCrud && (
											<VideoAttach
												interview={it}
												onAttached={() =>
													qc.invalidateQueries({ queryKey: ["interviews", { hr_connection_id: hrConnection.id }] })
												}
											/>
										)}
										{canCrud && (
											<Button variant="destructive" size="sm" onClick={() => del.mutate(it.id)}>
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
		</div>
	);
}
