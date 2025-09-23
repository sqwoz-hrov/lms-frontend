import { TasksApi, type TaskStatus, type UpdateTaskDto } from "@/api/tasksApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

import { ConfirmDeleteDialog } from "./parts/ConfirmDeleteDialog";
import { inputDateToIso, isoToInputDate } from "./parts/helpers";
import { TaskHeader } from "./parts/TaskHeader";
import { TaskMarkdown } from "./parts/TaskMarkdown";
import { TaskProperties } from "./parts/TaskProperties";

// ===== Props =====
export type TaskViewerDrawerProps = {
	taskId: string;
	onClose?: () => void;
};

export function TaskViewerDrawer({ taskId, onClose }: TaskViewerDrawerProps) {
	const qc = useQueryClient();
	const [isEdit, setIsEdit] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	// Load task
	const { data: task, isLoading: loadingTask } = useQuery({
		queryKey: ["task", taskId],
		queryFn: () => TasksApi.getById(taskId),
	});

	// Form
	const { register, handleSubmit, reset, watch, setValue } = useForm<UpdateTaskDto>({
		defaultValues: { id: taskId },
	});

	useEffect(() => {
		if (task) {
			reset({
				id: task.id,
				summary: task.summary,
				markdown_content: task.markdown_content,
				student_user_id: task.student_user_id,
				mentor_user_id: task.mentor_user_id,
				deadline: task.deadline,
				priority: task.priority,
				status: task.status,
			});
		}
	}, [task, reset]);

	// Mutations
	const updateMutation = useMutation({
		mutationFn: (payload: UpdateTaskDto) => TasksApi.update(payload),
		onSuccess: updated => {
			qc.setQueryData(["task", taskId], updated);
			qc.invalidateQueries({ queryKey: ["tasks"] });
			setIsEdit(false);
		},
	});

	const changeStatusMutation = useMutation({
		mutationFn: (payload: { id: string; status: TaskStatus }) => TasksApi.changeStatus(payload),
		onSuccess: updated => {
			qc.setQueryData(["task", taskId], updated);
			qc.invalidateQueries({ queryKey: ["tasks"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => TasksApi.remove(taskId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["tasks"] });
			setConfirmOpen(false);
			onClose?.();
		},
	});

	// Submit
	const onSubmit = (data: UpdateTaskDto) => {
		const payload: UpdateTaskDto = {
			...data,
			id: taskId,
			deadline: inputDateToIso(isoToInputDate(data.deadline)) ?? data.deadline,
		};
		updateMutation.mutate(payload);
	};

	// Derived
	const priority = watch("priority");
	const status = watch("status");

	// ===== Loading state
	if (loadingTask || !task) {
		return (
			// 1) Высота на весь вьюпорт внутри дроуэра + внутренний скролл
			<div className="flex h-[100dvh] flex-col overscroll-contain">
				{/* sticky header */}
				<div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3 text-sm">
						<Loader2 className="size-4 animate-spin" />
						Загрузка задачи…
					</div>
				</div>

				{/* прокручиваемая область */}
				<div className="flex-1 overflow-y-auto">
					<div className="mx-auto max-w-6xl px-4 py-6">
						<Card>
							<CardContent className="p-6 text-sm text-muted-foreground">Данные задачи загружаются…</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	// ===== Jira-like layout
	return (
		// 2) Та же конструкция в обычном состоянии
		<div className="flex h-[100dvh] flex-col overscroll-contain">
			{/* Sticky header */}
			<div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto max-w-6xl px-4 py-3">
					<TaskHeader
						task={task}
						isEdit={isEdit}
						setIsEdit={setIsEdit}
						register={register}
						onSubmit={handleSubmit(onSubmit)}
						onCancel={() => {
							reset(task);
							setIsEdit(false);
						}}
						updatePending={updateMutation.isPending}
						onDeleteClick={() => setConfirmOpen(true)}
					/>
				</div>
			</div>

			{/* Прокручиваемая центральная зона */}
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* Left: описание */}
					<div className="lg:col-span-8 space-y-6">
						<Card>
							<CardContent className="p-0">
								<TaskMarkdown isEdit={isEdit} register={register} markdown={task.markdown_content} />
							</CardContent>
						</Card>
					</div>

					{/* Right: свойства */}
					<div className="lg:col-span-4 space-y-6">
						<Card>
							<CardContent className="p-4">
								<TaskProperties
									task={task}
									isEdit={isEdit}
									register={register}
									setValue={setValue}
									status={status}
									priority={priority ?? task.priority}
									onStatusChange={s => changeStatusMutation.mutate({ id: task.id, status: s })}
									statusPending={changeStatusMutation.isPending}
								/>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			{/* Модалка удаления как была */}
			<ConfirmDeleteDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				onConfirm={() => deleteMutation.mutate()}
				pending={deleteMutation.isPending}
			/>
		</div>
	);
}
