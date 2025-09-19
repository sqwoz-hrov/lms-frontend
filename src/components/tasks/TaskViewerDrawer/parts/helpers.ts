import type { TaskStatus } from "@/api/tasksApi";

export const STATUS_LABEL: Record<TaskStatus, string> = {
	backlog: "Backlog",
	todo: "To Do",
	in_progress: "In Progress",
	in_review: "In Review",
	done: "Done",
};

export const PRIORITY_LABEL: Record<number, string> = {
	1: "P1 (Highest)",
	2: "P2",
	3: "P3",
	4: "P4",
	5: "P5 (Lowest)",
};

export function isoToInputDate(iso?: string) {
	if (!iso) return "";
	const d = new Date(iso);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function inputDateToIso(dateStr?: string) {
	if (!dateStr) return undefined;
	const d = new Date(dateStr + "T00:00:00.000Z");
	return d.toISOString();
}
