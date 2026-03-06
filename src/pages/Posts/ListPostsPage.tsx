// pages/Posts/ListPostsPage.tsx
import { PostsApi, type PostResponseDto } from "@/api/postsApi";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUp, CalendarClock, Film, Lock, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function getPreviewText(markdown: string): string {
	const noCode = markdown.replace(/```[\s\S]*?```/g, " ");
	const noInlineCode = noCode.replace(/`[^`]*`/g, " ");
	const noImages = noInlineCode.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
	const noLinks = noImages.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
	const noMd = noLinks.replace(/[>#*_~\-]+/g, " ");
	return noMd.replace(/\s+/g, " ").trim();
}

export function ListPostsPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);
	const [showGoTopButton, setShowGoTopButton] = useState(false);

	function toggleExpanded(postId: string) {
		setExpandedPostIds(prev => (prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]));
	}

	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	const {
		data,
		isLoading,
		isError,
		isRefetching,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		refetch,
	} = useInfiniteQuery({
		queryKey: ["posts"],
		queryFn: ({ pageParam }) => PostsApi.list({ before: pageParam, limit: 5 }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: lastPage => lastPage.next_cursor,
		staleTime: 30_000,
	});

	useEffect(() => {
		const target = loadMoreRef.current;
		if (!target || !hasNextPage) return;

		const observer = new IntersectionObserver(
			entries => {
				const [entry] = entries;
				if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					void fetchNextPage();
				}
			},
			{ rootMargin: "300px 0px" },
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	useEffect(() => {
		const onScroll = () => {
			setShowGoTopButton(window.scrollY > 600);
		};

		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const sorted = useMemo<PostResponseDto[]>(() => {
		const items = data?.pages.flatMap(page => page.items) ?? [];
		const deduped = new Map<string, PostResponseDto>();
		for (const item of items) {
			if (!deduped.has(item.id)) {
				deduped.set(item.id, item);
			}
		}
		return Array.from(deduped.values());
	}, [data]);

	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Посты</h1>
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
						const isExpanded = expandedPostIds.includes(post.id);
						const previewText = getPreviewText(post.markdown_content ?? "");

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
									<CardTitle className="text-2xl font-semibold leading-snug tracking-tight">
										<Link className="hover:underline underline-offset-4" to={`/posts/${post.id}`}>
											{post.title}
										</Link>
									</CardTitle>
								</CardHeader>
								<CardContent className="relative z-10 space-y-5 pt-0 pb-6">
									{isExpanded && isLocked && post.locked_preview?.has_video && (
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

									{isExpanded ? (
										isLocked ? (
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
										) : post.markdown_content?.trim() ? (
											<MarkdownRenderer markdown={post.markdown_content} mode="full" />
										) : (
											<p className="text-sm text-muted-foreground">В посте нет текстового контента.</p>
										)
									) : (
										<div className="space-y-2">
											<p
												className="text-sm text-muted-foreground"
												style={{
													display: "-webkit-box",
													WebkitLineClamp: 3,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
												}}
											>
												{previewText || "Контент поста доступен после раскрытия."}
											</p>
											{isLocked && (
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Lock className="h-3.5 w-3.5 text-rose-500" />
													<span>Часть контента закрыта подпиской.</span>
												</div>
											)}
										</div>
									)}
									<button
										type="button"
										onClick={() => toggleExpanded(post.id)}
										className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
										aria-expanded={isExpanded}
									>
										{isExpanded ? "Свернуть" : "Развернуть"}
									</button>

									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<CalendarClock className="h-3.5 w-3.5" />
										<time dateTime={post.created_at}>{formattedDate}</time>
									</div>
								</CardContent>
							</Card>
						);
					})}

					<div ref={loadMoreRef} className="flex min-h-14 items-center justify-center text-sm text-muted-foreground">
						{isFetchingNextPage
							? "Загружаем еще посты..."
							: hasNextPage
								? "Прокрутите ниже, чтобы загрузить еще"
								: "Посты закончились :("}
					</div>
				</div>
			)}
			{showGoTopButton && (
				<Button
					type="button"
					size="icon"
					className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full shadow-lg"
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
					title="Наверх"
					aria-label="Наверх"
				>
					<ArrowUp className="h-5 w-5" />
				</Button>
			)}
		</div>
	);
}
