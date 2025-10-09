import type { TaskResponseDto } from "@/api/tasksApi";
import type { UserResponse } from "@/api/usersApi";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useMemo, useState } from "react";
import { COLUMNS, type LocalTaskStatus } from "./constants";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardOverlay } from "./TaskCard";

type Props = {
	tasksByColumn: Record<LocalTaskStatus, TaskResponseDto[]>;
	onDragEnd: (e: DragEndEvent) => void;
	usersById: Map<string, UserResponse>;
	onOpenTask: (taskId: string) => void;
};

export function KanbanBoard({ tasksByColumn, onDragEnd, usersById, onOpenTask }: Props) {
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

	const allTasks = useMemo(() => Object.values(tasksByColumn).flatMap(columnTasks => columnTasks), [tasksByColumn]);
	const activeTask = useMemo(() => allTasks.find(t => t.id === activeTaskId) ?? null, [allTasks, activeTaskId]);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveTaskId(String(event.active.id));
	}, []);

	const handleDragCancel = useCallback(() => {
		setActiveTaskId(null);
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveTaskId(null);
			onDragEnd(event);
		},
		[onDragEnd],
	);

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
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
			<DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} usersById={usersById} /> : null}</DragOverlay>
		</DndContext>
	);
}
