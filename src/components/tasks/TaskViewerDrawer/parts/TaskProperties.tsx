// src/components/tasks/parts/TaskProperties.tsx
import { type TaskResponseDto, type TaskStatus, type UpdateTaskDto } from "@/api/tasksApi";
import { type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isoToInputDate, inputDateToIso, PRIORITY_LABEL, STATUS_LABEL } from "./helpers";
import { useMemo } from "react";
import { useUsers, getUserLabel } from "@/hooks/useUsers";

export function TaskProperties(props: {
	task: TaskResponseDto;
	isEdit: boolean;
	register: UseFormRegister<UpdateTaskDto>;
	setValue: UseFormSetValue<UpdateTaskDto>;
	status?: TaskStatus;
	priority: number;
	onStatusChange: (s: TaskStatus) => void;
	statusPending: boolean;
}) {
	const { task, isEdit, setValue, status, priority, onStatusChange, statusPending } = props;

	// --- Users loading ---
	const { data: users, isLoading: usersLoading } = useUsers();

	// Быстрые словари для поиска по id
	const usersById = useMemo(() => {
		const map = new Map<string, { id: string; label: string }>();
		(users ?? []).forEach(u => map.set(u.id, { id: u.id, label: getUserLabel({ name: u.name }) }));
		return map;
	}, [users]);

	// Костыль: если id нет в списке — добавляем фиктивную опцию, чтобы Select умел отобразить value.
	const ensureOption = (id?: string | null) => {
		if (!id) return undefined;
		const hit = usersById.get(id);
		if (hit) return hit;
		return { id, label: `Неизвестный пользователь (${id})` }; // временная подпись
	};

	const studentOption = ensureOption(task.student_user_id);
	const mentorOption = ensureOption(task.mentor_user_id);

	const renderUserReadable = (id?: string) => {
		if (!id) return "—";
		return usersById.get(id)?.label ?? `Неизвестный пользователь (${id})`;
	};

	return (
		<section className="lg:col-span-1 space-y-5">
			{/* Status */}
			<div className="space-y-2">
				<Label>Статус</Label>
				{isEdit ? (
					<Select value={status} onValueChange={v => setValue("status", v as TaskStatus)}>
						<SelectTrigger>
							<SelectValue placeholder="Выберите статус" />
						</SelectTrigger>
						<SelectContent>
							{Object.keys(STATUS_LABEL).map(s => (
								<SelectItem key={s} value={s}>
									{STATUS_LABEL[s as TaskStatus]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<div className="text-sm">{STATUS_LABEL[task.status]}</div>
				)}
				{!isEdit && (
					<div className="flex gap-2 flex-wrap">
						{Object.keys(STATUS_LABEL).map(s => (
							<Button
								key={s}
								size="sm"
								variant={s === task.status ? "default" : "outline"}
								onClick={() => onStatusChange(s as TaskStatus)}
								disabled={statusPending}
							>
								{STATUS_LABEL[s as TaskStatus]}
							</Button>
						))}
					</div>
				)}
			</div>

			{/* Priority */}
			<div className="space-y-2">
				<Label>Приоритет</Label>
				{isEdit ? (
					<Select value={String(priority ?? task.priority)} onValueChange={v => setValue("priority", Number(v))}>
						<SelectTrigger>
							<SelectValue placeholder="Выберите приоритет" />
						</SelectTrigger>
						<SelectContent>
							{[1, 2, 3, 4, 5].map(p => (
								<SelectItem key={p} value={String(p)}>
									{PRIORITY_LABEL[p]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<Badge variant="secondary">{PRIORITY_LABEL[task.priority] ?? task.priority}</Badge>
				)}
			</div>

			{/* Deadline */}
			<div className="space-y-2">
				<Label>Дедлайн</Label>
				{isEdit ? (
					<Input
						type="date"
						defaultValue={isoToInputDate(task.deadline)}
						onChange={e => setValue("deadline", inputDateToIso(e.target.value))}
					/>
				) : (
					<div className="text-sm">{isoToInputDate(task.deadline) || "—"}</div>
				)}
			</div>

			{/* Student / Mentor */}
			<div className="grid grid-cols-2 gap-4">
				{/* Student */}
				<div className="space-y-2">
					<Label>Студент</Label>
					{isEdit ? (
						<Select
							value={task.student_user_id || ""}
							onValueChange={v => setValue("student_user_id", v)}
							disabled={usersLoading}
						>
							<SelectTrigger>
								<SelectValue placeholder={usersLoading ? "Загрузка..." : "Выберите студента"} />
							</SelectTrigger>
							<SelectContent>
								{/* Костыль: текущий id вне списка */}
								{studentOption && !usersById.has(studentOption.id) && (
									<SelectItem value={studentOption.id}>{studentOption.label}</SelectItem>
								)}
								{(users ?? []).map(u => (
									<SelectItem key={u.id} value={u.id}>
										{getUserLabel({ name: u.name })}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<div className="text-sm break-all">{renderUserReadable(task.student_user_id)}</div>
					)}
				</div>

				{/* Mentor */}
				<div className="space-y-2">
					<Label>Ментор</Label>
					{isEdit ? (
						<Select
							value={task.mentor_user_id || ""}
							onValueChange={v => setValue("mentor_user_id", v)}
							disabled={usersLoading}
						>
							<SelectTrigger>
								<SelectValue placeholder={usersLoading ? "Загрузка..." : "Выберите ментора"} />
							</SelectTrigger>
							<SelectContent>
								{/* Костыль: текущий id вне списка */}
								{mentorOption && !usersById.has(mentorOption.id) && (
									<SelectItem value={mentorOption.id}>{mentorOption.label}</SelectItem>
								)}
								{(users ?? []).map(u => (
									<SelectItem key={u.id} value={u.id}>
										{getUserLabel({ name: u.name })}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<div className="text-sm break-all">{renderUserReadable(task.mentor_user_id)}</div>
					)}
				</div>
			</div>
		</section>
	);
}
