import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MaterialsApi, type MaterialResponseDto } from "@/api/materialsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Video, FileQuestion } from "lucide-react";

export function ViewMaterial() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: user } = useCurrentUser();
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
			// NOTE: в API-обёртке нет отдельного GET /materials/{id}, поэтому берём из списка и фильтруем по id
			const list = await MaterialsApi.list();
			return list.find(m => m.id === id) ?? null;
		},
		staleTime: 60_000,
	});

	const icon = useMemo(() => {
		switch (material?.type) {
			case "article":
				return <FileText className="h-5 w-5" />;
			case "video":
				return <Video className="h-5 w-5" />;
			default:
				return <FileQuestion className="h-5 w-5" />;
		}
	}, [material?.type]);

	if (!id) {
		return (
			<div className="min-h-[60vh] grid place-items-center text-muted-foreground">
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

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="rounded-lg bg-muted p-2">{icon}</div>
					<h1 className="text-2xl font-semibold tracking-tight">{material.name}</h1>
					<div className="flex items-center gap-2">
						<TypeBadge type={material.type} />
						{material.is_archived && <Badge variant="outline">Архив</Badge>}
					</div>
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

			{/* Content */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Содержание</CardTitle>
				</CardHeader>
				<CardContent>
					{material.markdown_content ? (
						<article className="prose max-w-none prose-headings:scroll-mt-24">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{material.markdown_content}</ReactMarkdown>
						</article>
					) : (
						<div className="text-sm text-muted-foreground">
							Для этого материала отсутствует поле <code>markdown_content</code>.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Optional video helper */}
			{material.type === "video" && material.video_id && (
				<div className="mt-6 text-sm text-muted-foreground">
					Видео ID: <code>{material.video_id}</code>
				</div>
			)}
		</div>
	);
}

function TypeBadge({ type }: { type: MaterialResponseDto["type"] }) {
	switch (type) {
		case "article":
			return <Badge variant="secondary">Статья</Badge>;
		case "video":
			return <Badge variant="secondary">Видео</Badge>;
		default:
			return <Badge variant="secondary">Другое</Badge>;
	}
}
