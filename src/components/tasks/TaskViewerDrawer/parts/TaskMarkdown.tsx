import { type UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UpdateTaskDto } from "@/api/tasksApi";

export function TaskMarkdown(props: {
	isEdit: boolean;
	register: UseFormRegister<UpdateTaskDto>;
	markdown?: string | null;
}) {
	const { isEdit, register, markdown } = props;

	return (
		<section className="lg:col-span-2 space-y-3">
			<Label>Описание (Markdown)</Label>
			{isEdit ? (
				<Textarea
					className="min-h-[280px] font-mono"
					{...register("markdown_content")}
					placeholder="Опишите задачу в Markdown…"
				/>
			) : markdown ? (
				<article className="prose max-w-none prose-headings:scroll-mt-24 text-sm">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
				</article>
			) : (
				<div className="text-xs text-muted-foreground">
					Для этой задачи отсутствует поле <code>markdown_content</code>.
				</div>
			)}
		</section>
	);
}
