import { type TaskResponseDto, type TaskStatus, type UpdateTaskDto } from "@/api/tasksApi";
import { type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isoToInputDate, inputDateToIso, PRIORITY_LABEL, STATUS_LABEL } from "./helpers";

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
	const { task, isEdit, register, setValue, status, priority, onStatusChange, statusPending } = props;

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
				<div className="space-y-2">
					<Label>Студент (user_id)</Label>
					{isEdit ? (
						<Input {...register("student_user_id")} placeholder="UUID студента" />
					) : (
						<div className="text-sm break-all">{task.student_user_id}</div>
					)}
				</div>
				<div className="space-y-2">
					<Label>Ментор (user_id)</Label>
					{isEdit ? (
						<Input {...register("mentor_user_id")} placeholder="UUID ментора" />
					) : (
						<div className="text-sm break-all">{task.mentor_user_id}</div>
					)}
				</div>
			</div>
		</section>
	);
}
