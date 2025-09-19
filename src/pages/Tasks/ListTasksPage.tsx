import { type TaskResponseDto, TasksApi } from "@/api/tasksApi";
import { getUsers, type UserResponse } from "@/api/usersApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { FiltersBar } from "@/components/tasks/FiltersBar";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { type LocalTaskStatus, type StatusMap } from "@/components/tasks/constants";
import { useUsersById } from "@/hooks/useUsersById";
import { loadStatusMap, saveStatusMap } from "@/components/tasks/kanbanState";
import type { DragEndEvent } from "@dnd-kit/core";
import { TaskViewerDrawer } from "@/components/tasks/TaskViewerDrawer";

export function ListTasksPage() {
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();

	const { data: me } = useCurrentUser();
	const isAdmin = !!me && (me as any).role === "admin";

	// —— Filters from URL ——
	const studentUserId = params.get("student_user_id") || undefined;
	const mentorUserId = params.get("mentor_user_id") || undefined;

	// —— Users ——
	const { data: users } = useQuery<UserResponse[]>({
		queryKey: ["users"],
		queryFn: getUsers,
		staleTime: 60_000,
	});
	const usersById = useUsersById(users);

	// —— Tasks ——
	const {
		data: tasks,
		isLoading,
		isError,
		refetch,
	} = useQuery<TaskResponseDto[]>({
		queryKey: ["tasks", { student_user_id: studentUserId, mentor_user_id: mentorUserId }],
		queryFn: () => TasksApi.list({ student_user_id: studentUserId, mentor_user_id: mentorUserId }),
		staleTime: 30_000,
	});

	// —— Local status map ——
	const [statusMap, setStatusMap] = useState<StatusMap>({});
	useEffect(() => {
		loadStatusMap({ student_user_id: studentUserId, mentor_user_id: mentorUserId }).then(setStatusMap);
	}, [studentUserId, mentorUserId]);

	// —— Derived: tasks by column ——
	const tasksByColumn = useMemo(() => {
		const map: Record<LocalTaskStatus, TaskResponseDto[]> = {
			todo: [],
			in_progress: [],
			review: [],
			done: [],
			archived: [],
		};
		for (const t of tasks || []) {
			const status = statusMap[t.id] || "todo";
			map[status].push(t);
		}
		(Object.keys(map) as LocalTaskStatus[]).forEach(k =>
			map[k].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
		);
		return map;
	}, [tasks, statusMap]);

	// —— DnD ——
	function handleDragEnd(event: DragEndEvent) {
		const { over, active } = event;
		if (!over) return;
		const taskId = String(active.id);
		const columnId = String(over.id) as LocalTaskStatus;

		setStatusMap(prev => {
			const next = { ...prev, [taskId]: columnId };
			saveStatusMap(next);
			return next;
		});
	}

	// —— Filters helpers ——
	function setStudentFilter(v?: string) {
		const next = new URLSearchParams(params);
		if (v) next.set("student_user_id", v);
		else next.delete("student_user_id");
		setParams(next, { replace: true });
	}
	function setMentorFilter(v?: string) {
		const next = new URLSearchParams(params);
		if (v) next.set("mentor_user_id", v);
		else next.delete("mentor_user_id");
		setParams(next, { replace: true });
	}
	function goCreateTask() {
		const q = [
			studentUserId ? `student_user_id=${studentUserId}` : "",
			mentorUserId ? `mentor_user_id=${mentorUserId}` : "",
		]
			.filter(Boolean)
			.join("&");
		navigate(`/tasks/new${q ? `?${q}` : ""}`);
	}

	// —— Dialog state for editor ——
	const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
	const openTask = (taskId: string) => setOpenedTaskId(taskId);
	const closeTask = () => setOpenedTaskId(null);

	return (
		<div className="container mx-auto px-4 py-6">
			<FiltersBar
				users={users}
				studentUserId={studentUserId}
				mentorUserId={mentorUserId}
				onChangeStudent={setStudentFilter}
				onChangeMentor={setMentorFilter}
				isAdmin={isAdmin}
				onCreateTask={goCreateTask}
			/>

			{isLoading ? (
				<div className="min-h-[40vh] grid place-items-center text-muted-foreground">Загрузка…</div>
			) : isError ? (
				<div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
					<p className="text-sm text-red-600">Не удалось загрузить задачи.</p>
					<Button onClick={() => refetch()}>Повторить</Button>
				</div>
			) : (
				<KanbanBoard
					tasksByColumn={tasksByColumn}
					onDragEnd={handleDragEnd}
					usersById={usersById}
					onOpenTask={openTask}
				/>
			)}

			{/* Editor dialog */}
			<Dialog open={!!openedTaskId} onOpenChange={v => !v && closeTask()}>
				<DialogContent className="sm:max-w-[75vw]">
					{openedTaskId && <TaskViewerDrawer taskId={openedTaskId} onClose={closeTask} />}
				</DialogContent>
			</Dialog>
		</div>
	);
}
