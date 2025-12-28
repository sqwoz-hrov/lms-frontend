// ViewMaterial.tsx
import { MaterialsApi, type MaterialResponseDto } from "@/api/materialsApi";
import { SubjectsApi, type SubjectResponseDto } from "@/api/subjectsApi";
import { GetByIdVideoResponseDto, VideosApi } from "@/api/videosApi";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { FileQuestion, FileText, Video } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

/** Приводим бэкенд-статусы к фазам плеера */
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

export function ViewMaterial() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = !!user && (user as any).role === "admin";

	const {
		data: material,
		isLoading,
		isError,
		refetch,
	} = useQuery<MaterialResponseDto | null>({
		queryKey: ["material", id],
		enabled: !!id,
		queryFn: async () => {
			const list = await MaterialsApi.list();
			return list.find(m => m.id === id) ?? null;
		},
		staleTime: 60_000,
	});

	// subject lazy-load
	const {
		data: subject,
		isLoading: subjectLoading,
		isError: subjectError,
		refetch: refetchSubject,
	} = useQuery<SubjectResponseDto | null>({
		queryKey: ["subject", material?.subject_id],
		enabled: !!material?.subject_id,
		queryFn: async () => (material?.subject_id ? SubjectsApi.getById(material.subject_id) : null),
		staleTime: 60_000,
	});

	// Видео-метаданные + presigned URL
	const {
		data: video,
		isLoading: videoLoading,
		isError: videoError,
		refetch: refetchVideo,
	} = useQuery<GetByIdVideoResponseDto | null>({
		queryKey: ["video", material?.video_id],
		enabled: !!material?.video_id,
		queryFn: async () => (material?.video_id ? VideosApi.getById(material.video_id) : null),
		staleTime: 5 * 60_000,
		retry: 1,
	});

	const icon = useMemo(() => {
		if (material?.video_id) return <Video className="h-5 w-5" />;
		if (material?.markdown_content) return <FileText className="h-5 w-5" />;
		return <FileQuestion className="h-5 w-5" />;
	}, [material?.video_id, material?.markdown_content]);

	if (!id) {
		return (
			<div className="min-h:[60vh] grid place-items-center text-muted-foreground">
				Некорректный адрес страницы: отсутствует id материала.
			</div>
		);
	}

	if (isLoading) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}

	if (isError) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
				<p className="text-sm text-red-600">Не удалось загрузить материал.</p>
				<Button onClick={() => refetch()}>Повторить</Button>
			</div>
		);
	}

	if (!material) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
				<p className="text-sm text-muted-foreground">Материал не найден.</p>
				<Button variant="secondary" onClick={() => navigate(-1)}>
					Назад
				</Button>
			</div>
		);
	}

	const hasMarkdown = !!material.markdown_content?.trim();
	const hasVideo = !!material.video_id;
	const hasContent = hasMarkdown || hasVideo;

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<div className="rounded-lg bg-muted p-2">{icon}</div>
					<h1 className="text-2xl font-semibold tracking-tight">{material.name}</h1>
					{material.is_archived && <Badge variant="outline">Архив</Badge>}
					{/* Subject pill */}
					{subjectLoading ? (
						<span className="h-6 w-28 rounded bg-muted animate-pulse" />
					) : subjectError ? (
						<Button size="sm" variant="secondary" onClick={() => refetchSubject()}>
							Повторить тему
						</Button>
					) : subject ? (
						<Badge variant="secondary" className="flex items-center gap-2">
							<span className="h-3 w-3 rounded-full border" style={{ backgroundColor: subject.color_code }} />
							{subject.name}
						</Badge>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					{isAdmin && (
						<Button onClick={() => navigate(`/materials/${material.id}/edit`)}>Редактировать материал</Button>
					)}
					<Button variant="secondary" onClick={() => navigate(-1)}>
						Назад
					</Button>
				</div>
			</div>

			<Card className="mb-6">
				{hasMarkdown && (
					<CardHeader>
						<CardTitle className="text-base">Содержание</CardTitle>
					</CardHeader>
				)}
				<CardContent className={hasContent ? "space-y-6" : undefined}>
					{hasContent ? (
						<>
							{hasMarkdown && (
								<article className="prose max-w-none prose-headings:scroll-mt-24">
									<MarkdownRenderer markdown={material.markdown_content!} mode="full" />
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
										title={material.name}
										phase={toPlayerPhase(video?.phase)}
									/>
									<div className="mt-3 text-xs text-muted-foreground">
										Видео ID: <code>{material.video_id}</code>
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
												<button className="underline underline-offset-4" onClick={() => refetchVideo()}>
													обновить ссылку
												</button>
											</>
										)}
									</div>
								</section>
							)}
						</>
					) : (
						<div className="text-sm text-muted-foreground">Контент для этого материала пока не добавлен.</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
