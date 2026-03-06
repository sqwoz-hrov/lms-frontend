import { type PostVideoReference, PostsApi, type PostResponseDto } from "@/api/postsApi";
import { GetByIdVideoResponseDto, VideosApi } from "@/api/videosApi";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, FileQuestion, FileText, Lock, Video } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function toPlayerPhase(p?: string): NonNullable<React.ComponentProps<typeof VideoPlayer>["phase"]> {
	switch (p) {
		case "receiving":
		case "hashing":
		case "uploading_s3":
		case "completed":
		case "failed":
			return p;
		case "processing":
			return "uploading_s3";
		default:
			return "receiving";
	}
}

function extractVideoId(videoRef?: PostVideoReference): string | null {
	if (!videoRef) return null;
	if (typeof videoRef === "string") return videoRef;
	if (typeof videoRef === "object" && "id" in videoRef && typeof videoRef.id === "string") {
		return videoRef.id;
	}
	return null;
}

export function ViewPostPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";

	const {
		data: post,
		isLoading,
		isError,
		refetch,
	} = useQuery<PostResponseDto | null>({
		queryKey: ["post", id],
		enabled: !!id,
		queryFn: async () => (id ? PostsApi.getById(id) : null),
		staleTime: 30_000,
	});

	const isLocked = Boolean(post?.locked_preview);
	const videoId = useMemo(() => extractVideoId(post?.video_id), [post?.video_id]);

	const {
		data: video,
		isLoading: videoLoading,
		isError: videoError,
		refetch: refetchVideo,
	} = useQuery<GetByIdVideoResponseDto | null>({
		queryKey: ["video", videoId],
		enabled: !!videoId && !isLocked,
		queryFn: async () => (videoId ? VideosApi.getById(videoId) : null),
		staleTime: 5 * 60_000,
		retry: 1,
	});

	const icon = useMemo(() => {
		if (videoId || post?.locked_preview?.has_video) return <Video className="h-5 w-5" />;
		if (post?.markdown_content?.trim()) return <FileText className="h-5 w-5" />;
		return <FileQuestion className="h-5 w-5" />;
	}, [videoId, post?.locked_preview?.has_video, post?.markdown_content]);

	if (!id) {
		return (
			<div className="min-h-[60vh] grid place-items-center text-muted-foreground">
				Упс! Пост не найден. Вероятно, вы перешли по некорректной ссылке или пост был удалён
			</div>
		);
	}

	if (isLoading) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}

	if (isError) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
				<p className="text-sm text-red-600">Не удалось загрузить пост.</p>
				<Button onClick={() => refetch()}>Повторить</Button>
			</div>
		);
	}

	if (!post) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
				<p className="text-sm text-muted-foreground">Пост не найден.</p>
				<Button variant="secondary" onClick={() => navigate(-1)}>
					Назад
				</Button>
			</div>
		);
	}

	const hasMarkdown = !!post.markdown_content?.trim() && !isLocked;
	const hasVideo = !!videoId && !isLocked;
	const hasContent = hasMarkdown || hasVideo;
	const formattedDate = new Date(post.created_at).toLocaleString();

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<div className="rounded-lg bg-muted p-2">{icon}</div>
					<h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
				</div>
				<div className="flex items-center gap-2">
					{isAdmin && <Button onClick={() => navigate(`/posts/${post.id}/edit`)}>Редактировать пост</Button>}
					<Button variant="secondary" onClick={() => navigate(-1)}>
						Назад
					</Button>
				</div>
			</div>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="text-base">Содержание</CardTitle>
				</CardHeader>
				<CardContent className={hasContent || isLocked ? "space-y-6" : undefined}>
					{isLocked ? (
						<>
							{post.locked_preview?.has_video && (
								<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
									<Video className="h-5 w-5" />
									<span className="flex-1">
										В этом посте есть видео. Чтобы смотреть его, оформите подписку выше.
									</span>
									<Button asChild variant="link" size="sm" className="px-0 text-amber-900">
										<Link to="/subscription">Улучшить подписку</Link>
									</Button>
								</div>
							)}

							<div className="space-y-6 rounded-2xl border border-dashed border-rose-400/40 bg-rose-100/20 p-6 backdrop-blur">
								<div className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-white/60 p-5">
									<div
										className="select-none text-base leading-relaxed text-muted-foreground"
										aria-hidden="true"
										style={{
											filter: "blur(4px)",
											userSelect: "none",
										}}
									>
										{"Чтобы увидеть пост полностью, улучшите подписку - закрытая часть доступна только участникам премиум-уровня."}
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
									<Lock className="h-4 w-4 text-rose-500" />
									<span>Контент доступен только подписчикам.</span>
									<Button
										asChild
										size="sm"
										variant="secondary"
										className="bg-rose-500 text-white hover:bg-rose-600"
									>
										<Link to="/subscription">Оформить подписку</Link>
									</Button>
								</div>
							</div>
						</>
					) : hasContent ? (
						<>
							{hasMarkdown && (
								<article className="prose max-w-none prose-headings:scroll-mt-24">
									<MarkdownRenderer markdown={post.markdown_content ?? ""} mode="full" />
								</article>
							)}
							{hasVideo && (
								<section>
									<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
										<h2 className="text-base font-semibold">Видео</h2>
										<div className="flex items-center gap-2">
											{videoLoading ? (
												<span className="text-xs text-muted-foreground">Загрузка ссылки…</span>
											) : videoError ? (
												<Button size="sm" variant="secondary" onClick={() => refetchVideo()}>
													Обновить ссылку
												</Button>
											) : null}
										</div>
									</div>
									<VideoPlayer
										src={video?.video_url}
										type={video?.mime_type ?? "video/mp4"}
										title={post.title}
										phase={toPlayerPhase(video?.phase)}
									/>
									<div className="mt-3 text-xs text-muted-foreground">
										Видео ID: <code>{videoId}</code>
										{video?.phase ? (
											<>
												{" "}
												• Статус: <code>{video.phase}</code>
											</>
										) : null}
										{video?.mime_type ? (
											<>
												{" "}
												• MIME: <code>{video.mime_type}</code>
											</>
										) : null}
										{!video?.video_url && !videoLoading && (
											<>
												{" "}
												•{" "}
												<button
													className="underline underline-offset-4"
													onClick={() => refetchVideo()}
												>
													обновить ссылку
												</button>
											</>
										)}
									</div>
								</section>
							)}
						</>
					) : (
						<div className="text-sm text-muted-foreground">Контент для этого поста пока не добавлен.</div>
					)}

					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<CalendarClock className="h-3.5 w-3.5" />
						<time dateTime={post.created_at}>{formattedDate}</time>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
