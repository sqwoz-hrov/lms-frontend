import type { TaskResponseDto } from "@/api/tasksApi";
import type { UserResponse } from "@/api/usersApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import * as React from "react";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";

type Props = {
	task: TaskResponseDto;
	usersById: Map<string, UserResponse>;
	onOpen: (taskId: string) => void;
};

type DeadlineInfo = { label: string; bg: string; color: string };

function getDeadlineInfo(deadline?: string | null): DeadlineInfo | null {
	if (!deadline) return null;

	const deadlineDate = new Date(deadline);
	if (Number.isNaN(deadlineDate.getTime())) return null;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const normalizedDeadline = new Date(deadlineDate);
	normalizedDeadline.setHours(0, 0, 0, 0);

	const formatted = deadlineDate.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
	});

	if (normalizedDeadline < today) {
		return { label: formatted, bg: "#ffe1e1", color: "#7a0b0b" };
	}

	if (normalizedDeadline.getTime() === today.getTime()) {
		return { label: formatted, bg: "#e3dcff", color: "#33215f" };
	}

	return { label: formatted, bg: "#e1f5ff", color: "#0b486f" };
}

export function TaskCard({ task, usersById, onOpen }: Props) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
	const style = {
		transform: CSS.Translate.toString(transform),
		cursor: isDragging ? "grabbing" : "grab",
		opacity: isDragging ? 0 : 1,
	} as React.CSSProperties;

	const deadlineInfo = React.useMemo(() => getDeadlineInfo(task.deadline), [task.deadline]);

	const student = usersById.get(task.student_user_id);
	const mentor = usersById.get(task.mentor_user_id);

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={`group transition ${isDragging ? "opacity-80 shadow-lg" : "hover:shadow-md"} !gap-3`}
			onClick={() => {
				if (!isDragging) onOpen(task.id);
			}}
			{...attributes}
			{...listeners}
		>
			<TaskCardBody task={task} student={student} mentor={mentor} deadlineInfo={deadlineInfo} />
		</Card>
	);
}

export function TaskCardOverlay({ task, usersById }: { task: TaskResponseDto; usersById: Map<string, UserResponse> }) {
	const deadlineInfo = getDeadlineInfo(task.deadline);
	const student = usersById.get(task.student_user_id);
	const mentor = usersById.get(task.mentor_user_id);

	return (
		<Card
			className="group pointer-events-none select-none shadow-lg !gap-3"
			style={{ cursor: "grabbing", transform: "scale(1.02)" }}
		>
			<TaskCardBody task={task} student={student} mentor={mentor} deadlineInfo={deadlineInfo} />
		</Card>
	);
}

function TaskCardBody({
	task,
	student,
	mentor,
	deadlineInfo,
}: {
	task: TaskResponseDto;
	student?: UserResponse;
	mentor?: UserResponse;
	deadlineInfo: DeadlineInfo | null;
}) {
	return (
		<>
			<CardHeader className="p-3 pb-1">
				<CardTitle className="text-m font-medium pl-1">
					<span className="line-clamp-2">{task.summary}</span>
				</CardTitle>

				<div className="mt-1 flex flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<Badge variant="outline">Студент</Badge>
						<span className="font-medium">{student?.name ?? "—"}</span>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<Badge variant="outline">Ментор</Badge>
						<span className="font-medium">{mentor?.name ?? "—"}</span>
					</div>
					{deadlineInfo ? (
						<div className="flex flex-wrap items-center gap-2 text-xs">
							<Badge variant="outline">Дедлайн</Badge>
							<span
								className="inline-flex items-center rounded-sm px-2 py-[2px] text-[10px] font-semibold tracking-tight"
								style={{ backgroundColor: deadlineInfo.bg, color: deadlineInfo.color }}
							>
								{deadlineInfo.label}
							</span>
						</div>
					) : null}
				</div>
			</CardHeader>

			{task.markdown_content ? (
				<CardContent>
					<MarkdownRenderer markdown={task.markdown_content} mode="preview" />
				</CardContent>
			) : (
				<CardContent>
					<div className="text-xs text-muted-foreground">
						Для этой задачи отсутствует поле <code>markdown_content</code>.
					</div>
				</CardContent>
			)}
		</>
	);
}
