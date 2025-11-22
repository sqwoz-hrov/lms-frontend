import { type TaskResponseDto, TasksApi } from "@/api/tasksApi";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { FiltersBar } from "@/components/tasks/FiltersBar";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskViewerDrawer } from "@/components/tasks/TaskViewerDrawer";
import { type LocalTaskStatus, type StatusMap } from "@/components/tasks/constants";
import { loadStatusMap, saveStatusMap } from "@/components/tasks/kanbanState";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useUsersById } from "@/hooks/useUsersById";
import type { DragEndEvent } from "@dnd-kit/core";
import { useAuth } from "../../hooks/useAuth";
import { UsersLoader, useUsersLoader } from "@/components/users/UsersLoader";

export function ListTasksPage() {
	const { user: me } = useAuth();
	const isAdmin = !!me && (me as any).role === "admin";
	return (
		<UsersLoader roles={["user", "admin"]}>
			<ListTasksPageContent isAdmin={isAdmin} />
		</UsersLoader>
	);
}

type ListTasksPageContentProps = {
	isAdmin: boolean;
};

function ListTasksPageContent({ isAdmin }: ListTasksPageContentProps) {
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();

	// —— Filters from URL ——
	const studentUserId = params.get("student_user_id") || undefined;
	const mentorUserId = params.get("mentor_user_id") || undefined;
	const activeTaskId = params.get("task_id") || null;

	// —— Users ——
	const { users } = useUsersLoader();
	const usersById = useUsersById(users ?? []);

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

	// —— Dialog state for editor synced with URL ——
	function openTask(taskId: string) {
		if (activeTaskId === taskId) return;
		const next = new URLSearchParams(params);
		next.set("task_id", taskId);
		setParams(next);
	}
	function closeTask() {
		if (!activeTaskId) return;
		const next = new URLSearchParams(params);
		next.delete("task_id");
		setParams(next);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<FiltersBar
				users={users}
				studentUserId={studentUserId}
				mentorUserId={mentorUserId}
				onChangeStudent={setStudentFilter}
				onChangeMentor={setMentorFilter}
				isAdmin={isAdmin}
				showStudentFilter={isAdmin}
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

			{/* Editor sheet */}
			<Sheet open={!!activeTaskId} onOpenChange={v => !v && closeTask()}>
				<SheetContent
					side="right"
					className="
    				  p-0
    				  /* Снимаем ограничение max-width у шадсиита */
    				  max-w-none sm:max-w-none lg:max-w-none
    				  /* Ширина дроуэра: почти фулл на мобиле, ~полэкрана на десктопе */
    				  w-[100dvw] sm:w-[85dvw] lg:w-[50dvw] 2xl:w-[46dvw]
    				  /* Анимации как были */
    				  data-[state=open]:animate-in data-[state=closed]:animate-out
    				  data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right
    				  data-[state=open]:duration-300 data-[state=closed]:duration-200
    				"
				>
					{activeTaskId && <TaskViewerDrawer taskId={activeTaskId} onClose={closeTask} />}
				</SheetContent>
			</Sheet>
		</div>
	);
}
