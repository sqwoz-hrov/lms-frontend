type MarkdownLoader = () => Promise<string>;

export type FaqArticle = {
	categorySlug: string;
	categoryTitle: string;
	articleSlug: string;
	articleTitle: string;
	route: string;
	loadMarkdown: MarkdownLoader;
};

export type FaqCategory = {
	slug: string;
	title: string;
	articles: FaqArticle[];
};

const markdownModules = import.meta.glob<string>("./content/**/*.md", {
	query: "?raw",
	import: "default",
});

const MAX_SLUG_LENGTH = 80;
const FAQ_BASE_PATH = "/faq";

function slugToTitle(slug: string): string {
	return slug
		.split("-")
		.filter(Boolean)
		.map(chunk => chunk[0].toUpperCase() + chunk.slice(1))
		.join(" ");
}

function toLowerKebab(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function isSafeFaqSlug(value: string): boolean {
	if (!value || value.length > MAX_SLUG_LENGTH) return false;

	let prevDash = false;
	for (let i = 0; i < value.length; i += 1) {
		const code = value.charCodeAt(i);
		const isLowerLatin = code >= 97 && code <= 122;
		const isDigit = code >= 48 && code <= 57;
		const isDash = code === 45;

		if (!isLowerLatin && !isDigit && !isDash) return false;
		if (isDash && (i === 0 || i === value.length - 1 || prevDash)) return false;
		prevDash = isDash;
	}

	return true;
}

function toRoute(categorySlug: string, articleSlug: string): string {
	return `${FAQ_BASE_PATH}/${categorySlug}/${articleSlug}`;
}

function parseModulePath(modulePath: string): { categoryName: string; articleFileName: string } | null {
	const prefix = "./content/";
	if (!modulePath.startsWith(prefix)) return null;

	const relativePath = modulePath.slice(prefix.length);
	const parts = relativePath.split("/");
	if (parts.length !== 2) return null;

	const [categoryName, fileName] = parts;
	if (!fileName.endsWith(".md")) return null;

	return {
		categoryName,
		articleFileName: fileName.slice(0, -3),
	};
}

const translationMap: Record<string, string> = {
    'Subscription': "Подписка",
    'Subscription Terms': "Условия подписки",
};

const allArticles: FaqArticle[] = Object.entries(markdownModules)
	.map(([modulePath, loadMarkdown]) => {
		const parsed = parseModulePath(modulePath);
		if (!parsed) return null;

		const categorySlug = toLowerKebab(parsed.categoryName);
		const articleSlug = toLowerKebab(parsed.articleFileName);

		if (!isSafeFaqSlug(categorySlug)) {
			throw new Error(`Invalid FAQ category slug generated from path: ${modulePath}`);
		}
		if (!isSafeFaqSlug(articleSlug)) {
			throw new Error(`Invalid FAQ article slug generated from path: ${modulePath}`);
		}

		return {
			categorySlug,
			categoryTitle: translationMap[slugToTitle(categorySlug)] ?? slugToTitle(categorySlug),
			articleSlug,
			articleTitle: translationMap[slugToTitle(articleSlug)] ?? slugToTitle(articleSlug),
			route: toRoute(categorySlug, articleSlug),
			loadMarkdown,
		} satisfies FaqArticle;
	})
	.filter((article): article is FaqArticle => Boolean(article))
	.sort((a, b) => {
		if (a.categoryTitle === b.categoryTitle) {
			return a.articleTitle.localeCompare(b.articleTitle);
		}
		return a.categoryTitle.localeCompare(b.categoryTitle);
	});

const articleLookup = new Map<string, FaqArticle>();
for (const article of allArticles) {
	const key = `${article.categorySlug}/${article.articleSlug}`;
	if (articleLookup.has(key)) {
		throw new Error(`Duplicate FAQ route key detected: ${key}`);
	}
	articleLookup.set(key, article);
}

const categoriesLookup = new Map<string, FaqCategory>();
for (const article of allArticles) {
	const existing = categoriesLookup.get(article.categorySlug);
	if (existing) {
		existing.articles.push(article);
		continue;
	}

	categoriesLookup.set(article.categorySlug, {
		slug: article.categorySlug,
		title: article.categoryTitle,
		articles: [article],
	});
}

const faqCategories = Array.from(categoriesLookup.values());
const firstArticleRoute = allArticles[0]?.route ?? null;

export function getFaqCategories(): FaqCategory[] {
	return faqCategories;
}

export function getFaqFirstArticleRoute(): string | null {
	return firstArticleRoute;
}

export function getFaqArticle(categorySlug: string, articleSlug: string): FaqArticle | null {
	const key = `${categorySlug}/${articleSlug}`;
	return articleLookup.get(key) ?? null;
}
