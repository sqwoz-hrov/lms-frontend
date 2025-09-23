import { type UseFormRegister } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateTaskDto } from "@/api/tasksApi";
import { MarkdownRenderer } from "../../../markdown/MarkdownRenderer";

export function TaskMarkdown(props: {
	isEdit: boolean;
	register: UseFormRegister<UpdateTaskDto>;
	markdown?: string | null;
}) {
	const { isEdit, register, markdown } = props;

	return (
		<section className="lg:col-span-2 space-y-2 px-6">
			<Label className="block scroll-m-20 text-xl lg:text-2xl font-extrabold tracking-tight">Описание</Label>

			{isEdit ? (
				<Textarea
					className="min-h-[280px] font-mono"
					{...register("markdown_content")}
					placeholder="Опишите задачу в Markdown…"
				/>
			) : markdown ? (
				<MarkdownRenderer markdown={markdown} mode="full" />
			) : (
				<div className="text-xs text-muted-foreground">
					Для этой задачи отсутствует поле <code>markdown_content</code>.
				</div>
			)}
		</section>
	);
}
