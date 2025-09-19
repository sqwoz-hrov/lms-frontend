import { useDroppable } from "@dnd-kit/core";
import type { Column } from "./constants";
import type { TaskResponseDto } from "@/api/tasksApi";
import type { UserResponse } from "@/api/usersApi";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { EmptyColumn } from "./EmptyColumn";

type Props = {
	column: Column;
	tasks: TaskResponseDto[];
	usersById: Map<string, UserResponse>;
	onOpen: (taskId: string) => void;
};

export function KanbanColumn({ column, tasks, usersById, onOpen }: Props) {
	const { setNodeRef, isOver } = useDroppable({ id: column.id });

	return (
		<div
			ref={setNodeRef}
			className={`min-h-[60vh] rounded-2xl border bg-card transition ${isOver ? "ring-2 ring-primary/40" : ""}`}
		>
			<div className="sticky top-0 z-10 rounded-t-2xl border-b bg-card/70 backdrop-blur p-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold tracking-tight">{column.title}</h2>
					<Badge variant="secondary">{tasks.length}</Badge>
				</div>
				{column.hint && <span className="text-xs text-muted-foreground">{column.hint}</span>}
			</div>

			<div className="p-3 space-y-3">
				{tasks.length === 0 ? (
					<EmptyColumn />
				) : (
					tasks.map(t => <TaskCard key={t.id} task={t} usersById={usersById} onOpen={onOpen} />)
				)}
			</div>
		</div>
	);
}
