import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";

import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

type Props = {
	markdown: string;
	mode?: "full" | "preview";
	className?: string;
};

function stripYamlFrontMatter(src: string) {
	if (src.startsWith("---")) {
		const end = src.indexOf("\n---", 3);
		if (end !== -1) return src.slice(end + 4);
	}
	return src;
}

// базовый безопасный schema + то, что уже разрешали
const baseSchema = {
	...defaultSchema,
	tagNames: [
		...(defaultSchema.tagNames || []),
		"details",
		"summary",
		"kbd",
		"button",
		"table",
		"thead",
		"tbody",
		"tfoot",
		"tr",
		"td",
		"th",
		"dl",
		"dt",
		"dd",
		"section",
		"sup",
		"math",
		"mrow",
		"mi",
		"mo",
		"mn",
		"msup",
		"mfrac",
		"mtext",
		"semantics",
		"annotation",
	],
	attributes: {
		...defaultSchema.attributes,
		"*": [
			...(defaultSchema.attributes?.["*"] || []),
			"className",
			"id",
			["data-footnote-ref", "data-footnote-backref"],
		],
		a: [...(defaultSchema.attributes?.a || []), "href", "name", "target", "rel"],
		img: [...(defaultSchema.attributes?.img || []), "src", "alt", "title", "width", "height", "loading", "decoding"],
		button: ["type", "disabled", "name", "value", "aria-label", "title"],
		details: ["open"],
		summary: ["aria-label", "title"],
		h1: ["id"],
		h2: ["id"],
		h3: ["id"],
		h4: ["id"],
		h5: ["id"],
		h6: ["id"],
		sup: ["id"],
		section: ["className", "aria-label"],
	},
	protocols: {
		...defaultSchema.protocols,
		href: ["http", "https", "mailto", "tel", "#"],
		src: ["http", "https", "data"],
	},
};

// для превью ужесточим: запретим изображения/таблицы/блок-коды и т.п.
const previewSchema = {
	...baseSchema,
	tagNames: baseSchema.tagNames.filter(
		t => !["img", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "pre", "code", "hr", "blockquote"].includes(t),
	),
};

export function MarkdownRenderer({ markdown, mode = "full", className }: Props) {
	const content = stripYamlFrontMatter(markdown ?? "");
	const isPreview = mode === "preview";

	const components = isPreview
		? {
				img: () => null,
				table: () => null,
				thead: () => null,
				tbody: () => null,
				tfoot: () => null,
				tr: () => null,
				td: () => null,
				th: () => null,
				pre: () => null,
				blockquote: () => null,
				hr: () => null,
			}
		: undefined;

	const containerClass = isPreview
		? [
				"prose",
				"prose-sm",
				"prose-preview",
				"max-w-none",
				"text-[13px]",
				// сброс заголовков
				"prose-headings:my-0",
				"prose-headings:leading-snug",
				"prose-headings:font-semibold",
				// компактные размеры
				"prose-h1:text-base",
				"prose-h2:text-base",
				"prose-h3:text-base",
				"prose-h4:text-base",
				"prose-h5:text-base",
				"prose-h6:text-base",
			].join(" ")
		: ["prose", "max-w-none", "prose-headings:scroll-mt-24", "text-sm"].join(" ");

	return (
		<div
			className={
				isPreview
					? "relative overflow-hidden max-h-36 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-10 after:bg-gradient-to-t after:from-background after:to-transparent"
					: undefined
			}
		>
			<article className={`${containerClass} ${className ?? ""}`}>
				<ReactMarkdown
					remarkPlugins={[remarkGfm, remarkFrontmatter, remarkMath]}
					rehypePlugins={[
						rehypeRaw,
						[rehypeSanitize, isPreview ? previewSchema : baseSchema],
						rehypeKatex,
						rehypeSlug,
						[rehypeAutolinkHeadings, { behavior: "append" }],
						rehypeHighlight,
					]}
					components={components}
				>
					{content}
				</ReactMarkdown>
			</article>
		</div>
	);
}
