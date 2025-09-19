import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TaskResponseDto } from "@/api/tasksApi";
import type { UserResponse } from "@/api/usersApi";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as React from "react";

type Props = {
	task: TaskResponseDto;
	usersById: Map<string, UserResponse>;
	onOpen: (taskId: string) => void;
};

export function TaskCard({ task, usersById, onOpen }: Props) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
	const style = { transform: CSS.Translate.toString(transform) } as React.CSSProperties;

	const student = usersById.get(task.student_user_id);
	const mentor = usersById.get(task.mentor_user_id);

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={`group transition ${isDragging ? "opacity-80 shadow-lg" : "hover:shadow-md"} cursor-pointer`}
			onClick={() => onOpen(task.id)}
			// ВАЖНО: listeners НЕ на всю карточку, а на ручку ниже
		>
			<CardHeader className="p-3 pb-1">
				<CardTitle className="text-sm font-medium flex items-start gap-2">
					{/* Drag handle */}
					<span
						{...attributes}
						{...listeners}
						className="mt-[2px] inline-flex items-center justify-center rounded p-1 text-muted-foreground opacity-60 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
						onClick={e => e.stopPropagation()} // чтобы клик по ручке не открывал диалог
						role="button"
						aria-label="Перетащить"
						title="Перетащить"
					>
						<GripVertical className="h-4 w-4 shrink-0" />
					</span>

					<span className="line-clamp-2">{task.summary}</span>
				</CardTitle>

				{/* Полная информация о студенте и менторе */}
				<div className="mt-2 flex flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<Badge variant="outline">Студент</Badge>
						<span className="font-medium">{student?.name ?? "—"}</span>
						{student?.email && <span className="text-muted-foreground">· {student.email}</span>}
						{student?.telegram_username && (
							<span className="text-muted-foreground">· @{student.telegram_username}</span>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<Badge variant="outline">Ментор</Badge>
						<span className="font-medium">{mentor?.name ?? "—"}</span>
						{mentor?.email && <span className="text-muted-foreground">· {mentor.email}</span>}
						{mentor?.telegram_username && <span className="text-muted-foreground">· @{mentor.telegram_username}</span>}
					</div>
				</div>
			</CardHeader>

			{/* Рендер Markdown */}
			{task.markdown_content ? (
				<CardContent className="p-3 pt-2">
					<article className="prose max-w-none prose-headings:scroll-mt-24 text-sm">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{task.markdown_content}</ReactMarkdown>
					</article>
				</CardContent>
			) : (
				<CardContent className="p-3 pt-2">
					<div className="text-xs text-muted-foreground">
						Для этой задачи отсутствует поле <code>markdown_content</code>.
					</div>
				</CardContent>
			)}
		</Card>
	);
}
