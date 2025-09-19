import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { TaskResponseDto } from "@/api/tasksApi";
import type { UserResponse } from "@/api/usersApi";
import { COLUMNS, type LocalTaskStatus } from "./constants";
import { KanbanColumn } from "./KanbanColumn";

type Props = {
	tasksByColumn: Record<LocalTaskStatus, TaskResponseDto[]>;
	onDragEnd: (e: DragEndEvent) => void;
	usersById: Map<string, UserResponse>;
	onOpenTask: (taskId: string) => void;
};

export function KanbanBoard({ tasksByColumn, onDragEnd, usersById, onOpenTask }: Props) {
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

	return (
		<DndContext sensors={sensors} onDragEnd={onDragEnd}>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
				{COLUMNS.map(col => (
					<KanbanColumn
						key={col.id}
						column={col}
						tasks={tasksByColumn[col.id]}
						usersById={usersById}
						onOpen={onOpenTask}
					/>
				))}
			</div>
		</DndContext>
	);
}
