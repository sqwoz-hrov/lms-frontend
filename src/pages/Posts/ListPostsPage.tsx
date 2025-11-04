// pages/Posts/ListPostsPage.tsx
import { PostsApi, type PostResponseDto } from "@/api/postsApi";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Film, Lock, RefreshCcw } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

export function ListPostsPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";

	const {
		data: posts,
		isLoading,
		isError,
		isRefetching,
		refetch,
	} = useQuery<PostResponseDto[]>({
		queryKey: ["posts"],
		queryFn: () => PostsApi.list(),
		staleTime: 30_000,
	});

	const sorted = useMemo(() => {
		return [...(posts ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
	}, [posts]);

	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Посты</h1>
					<p className="text-sm text-muted-foreground">Новости и обновления курсов для подписчиков.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => refetch()}
						disabled={isRefetching}
						title="Обновить список"
					>
						{isRefetching ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
					</Button>
					{isAdmin && (
						<Button onClick={() => navigate("/posts/new")} variant="default">
							Создать пост
						</Button>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="min-h-[40vh] grid place-items-center text-muted-foreground">Загрузка…</div>
			) : isError ? (
				<div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
					<p className="text-sm text-red-600">Не удалось загрузить посты.</p>
					<Button onClick={() => refetch()}>Повторить</Button>
				</div>
			) : !sorted.length ? (
				<Card className="border-dashed">
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-sm text-muted-foreground">Посты отсутствуют.</p>
						{isAdmin && <Button onClick={() => navigate("/posts/new")}>Создать первый пост</Button>}
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-7">
					{sorted.map(post => {
						const isLocked = Boolean(post.locked_preview);
						const formattedDate = new Date(post.created_at).toLocaleString();

						return (
							<Card
								key={post.id}
								className={cn(
									"group relative overflow-hidden rounded-3xl border border-border/60 bg-background transition-transform duration-300",
								)}
							>
								<CardHeader className="relative z-10 flex flex-col gap-4 pb-0">
									<div className="flex items-start gap-4">
										{isAdmin && (
											<Button variant="ghost" size="sm" onClick={() => navigate(`/posts/${post.id}/edit`)}>
												Редактировать
											</Button>
										)}
									</div>
									<CardTitle className="text-2xl font-semibold leading-snug tracking-tight">{post.title}</CardTitle>
								</CardHeader>
								<CardContent className="relative z-10 space-y-5 pt-0 pb-6">
									{isLocked && post.locked_preview?.has_video && (
										<div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
											<Film className="h-5 w-5" />
											<span className="flex-1">
												В этом посте есть видео. Чтобы смотреть его, оформите подписку выше.
											</span>
											<Button asChild variant="link" size="sm" className="px-0 text-amber-900">
												<Link to="/subscription">Улучшить подписку</Link>
											</Button>
										</div>
									)}

									{isLocked ? (
										<div className="space-y-6 rounded-2xl border border-dashed border-rose-400/40 bg-rose-100/20 p-6 backdrop-blur">
											<div className="relative overflow-hidden rounded-xl border border-rose-200/70 bg-white/60 p-5">
												<div
													className="select-none text-base leading-relaxed text-muted-foreground"
													data-paywall-blur
													aria-hidden="true"
													style={{
														filter: "blur(4px)",
														userSelect: "none",
													}}
												>
													{
														"Чтобы увидеть продолжение, улучшите подписку — закрытая часть поста доступна только участникам премиум-уровня."
													}
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
									) : (
										<MarkdownRenderer markdown={post.markdown_content} mode="full" />
									)}

									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<CalendarClock className="h-3.5 w-3.5" />
										<time dateTime={post.created_at}>{formattedDate}</time>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
