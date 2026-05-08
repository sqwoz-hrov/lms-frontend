import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SupportRequestButton } from "@/components/common/SupportRequestButton";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { FaqArticle, getFaqArticle, getFaqCategories, getFaqFirstArticleRoute, isSafeFaqSlug } from "@/faq/catalog";

const faqCategories = getFaqCategories();
const faqRootFallback = getFaqFirstArticleRoute() ?? "/";

function ArticleLoadingState() {
	return (
		<div className="space-y-3">
			<div className="h-4 w-40 animate-pulse rounded bg-muted" />
			<div className="h-4 w-full animate-pulse rounded bg-muted" />
			<div className="h-4 w-full animate-pulse rounded bg-muted" />
			<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
		</div>
	);
}

function ArticleErrorState({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
			<p>Не удалось загрузить статью. Попробуйте обновить содержимое.</p>
			<Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
				Повторить
			</Button>
		</div>
	);
}

function FaqArticlePage({ article }: { article: FaqArticle }) {

	const [openCategorySlugs, setOpenCategorySlugs] = useState<Set<string>>(() => {
		const firstCategorySlug = faqCategories[0]?.slug;
		if (!firstCategorySlug) return new Set<string>();
		return new Set([firstCategorySlug]);
	});

	useEffect(() => {
		setOpenCategorySlugs(prev => {
			if (prev.has(article.categorySlug)) return prev;
			const next = new Set(prev);
			next.add(article.categorySlug);
			return next;
		});
	}, [article.categorySlug]);

	const { data: markdown, isLoading, isError, refetch } = useQuery({
		queryKey: ["faq-article", article.categorySlug, article.articleSlug],
		queryFn: () => article.loadMarkdown(),
		staleTime: Infinity,
		retry: 1,
	});

	const toggleCategory = (slug: string) => {
		setOpenCategorySlugs(prev => {
			const next = new Set(prev);
			if (next.has(slug)) {
				next.delete(slug);
			} else {
				next.add(slug);
			}
			return next;
		});
	};

	return (
		<main className="min-h-dvh bg-background">
			<div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
				<section className="mb-6 rounded-xl border bg-card/60 p-5 shadow-sm md:p-7">
					<h1 className="text-3xl font-semibold tracking-tight md:text-4xl">FAQ по платформе</h1>
				</section>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<aside className="lg:col-span-4">
						<Card className="py-0">
							<CardHeader className="border-b py-4">
								<CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">Категории</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								<nav aria-label="FAQ categories" className="divide-y">
									{faqCategories.map(category => {
										const isOpen = openCategorySlugs.has(category.slug);

										return (
											<div key={category.slug} className="px-4 py-2">
												<button
													type="button"
													onClick={() => toggleCategory(category.slug)}
													className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-muted"
												>
													<span>{category.title}</span>
													{isOpen ? <Minus className="h-4 w-4 text-muted-foreground" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
												</button>

												{isOpen && (
													<ul className="space-y-1 pb-2 pl-2 pt-1">
														{category.articles.map(categoryArticle => {
															const isActive =
																categoryArticle.categorySlug === article.categorySlug &&
																categoryArticle.articleSlug === article.articleSlug;

															return (
																<li key={categoryArticle.route}>
																	<Link
																		to={categoryArticle.route}
																		className={cn(
																			"block rounded-md px-3 py-2 text-sm text-foreground/85 hover:bg-muted",
																			isActive && "bg-secondary font-medium text-foreground",
																		)}
																	>
																		{categoryArticle.articleTitle}
																	</Link>
																</li>
															);
														})}
													</ul>
												)}
											</div>
										);
									})}
								</nav>
							</CardContent>
						</Card>
					</aside>

					<section className="lg:col-span-8">
						<Card>
							<CardContent className="pt-6">
								{isLoading && <ArticleLoadingState />}
								{isError && <ArticleErrorState onRetry={() => void refetch()} />}
								{!isLoading && !isError && markdown && (
									<>
										<MarkdownRenderer markdown={markdown} className="text-sm md:text-[15px]" />
										<div className="mt-10 border-t pt-6">
											<h3 className="text-lg font-semibold text-foreground">
												Не нашли ответа на свой вопрос? Напишите в саппорт по кнопке ниже
											</h3>
											<div className="mt-4">
												<SupportRequestButton mode="inline" />
											</div>
										</div>
									</>
								)}
								{!isLoading && !isError && !markdown && (
									<div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
										Статья пока недоступна. Вернитесь в список FAQ.
									</div>
								)}
							</CardContent>
						</Card>
					</section>
				</div>
			</div>
		</main>
	);
}

export function FaqArticleBoundaryPage() {
	const { categorySlug = "", articleSlug = "" } = useParams();

	if (!faqCategories.length) {
		return <Navigate to={faqRootFallback} replace />;
	}

	if (!isSafeFaqSlug(categorySlug) || !isSafeFaqSlug(articleSlug)) {
		return <Navigate to="/faq" replace />;
	}

	const article = getFaqArticle(categorySlug, articleSlug);
	if (!article) {
		return <Navigate to="/faq" replace />;
	}

	return <FaqArticlePage article={article} />;
}
