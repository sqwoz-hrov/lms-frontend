// Канбан: типы, колонки и соответствия серверным статусам

import type { TaskStatus as ServerStatus } from "@/api/tasksApi";

export type LocalTaskStatus = "todo" | "in_progress" | "review" | "done" | "archived";

export type Column = {
	id: LocalTaskStatus;
	title: string;
	hint?: string;
};

export const COLUMNS: Column[] = [
	{ id: "todo", title: "To Do", hint: "Незапланированные" },
	{ id: "in_progress", title: "In Progress", hint: "В работе" },
	{ id: "review", title: "Review", hint: "Проверка" },
	{ id: "done", title: "Done", hint: "Готово" },
	{ id: "archived", title: "Archived", hint: "Скрытые" },
];

// Локальные колонки (канбан) -> серверные статусы
export const localToServer: Record<LocalTaskStatus, ServerStatus | null> = {
	todo: "todo",
	in_progress: "in_progress",
	review: "in_review",
	done: "done",
	archived: null, // на сервере нет "archived" — не отправляем
};

// Серверные статусы -> локальные колонки
export const serverToLocal: Record<ServerStatus, LocalTaskStatus> = {
	backlog: "todo",
	todo: "todo",
	in_progress: "in_progress",
	in_review: "review",
	done: "done",
};

export const STATUS_STORAGE_KEY = "taskStatusMap.v1";
export const ALL = "__ALL__";

export type StatusMap = Record<string, LocalTaskStatus>; // taskId -> status
