import { type TaskResponseDto, type UpdateTaskDto } from "@/api/tasksApi";
import { type UseFormRegister } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Check, Copy, Loader2, Pencil, Save, Trash2, X, XCircle } from "lucide-react";
import { isoToInputDate, PRIORITY_LABEL, STATUS_LABEL } from "./helpers";

export function TaskHeader(props: {
	task: TaskResponseDto;
	isEdit: boolean;
	setIsEdit: (v: boolean) => void;
	register: UseFormRegister<UpdateTaskDto>;
	onSubmit: () => void;
	onCancel: () => void;
	updatePending: boolean;
	onDeleteClick: () => void;
	onCopyLink: () => void;
	copyStatus: "idle" | "success" | "error";
	isAdmin: boolean;
}) {
	const {
		task,
		isEdit,
		setIsEdit,
		register,
		onSubmit,
		onCancel,
		updatePending,
		onDeleteClick,
		onCopyLink,
		copyStatus,
		isAdmin,
	} = props;

	return (
		<CardHeader className="flex flex-row items-start justify-between gap-4">
			<div className="flex-1 min-w-0">
				{isEdit ? (
					<Input
						className="text-xl font-semibold"
						{...register("summary", { required: true })}
						placeholder="Краткое описание задачи"
					/>
				) : (
					<CardTitle className="text-xl break-words">{task.summary}</CardTitle>
				)}
				<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<Badge variant="secondary">ID: {task.id}</Badge>
					<Badge variant="outline">Статус: {STATUS_LABEL[task.status]}</Badge>
					<Badge variant="outline">Приоритет: {PRIORITY_LABEL[task.priority] ?? task.priority}</Badge>
					<span className="inline-flex items-center gap-1">
						<CalendarIcon className="size-4" />
						Дедлайн: {isoToInputDate(task.deadline) || "—"}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{isEdit ? (
					<>
						<Button size="sm" onClick={onSubmit} disabled={updatePending}>
							{updatePending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
							Сохранить
						</Button>
						<Button size="sm" variant="ghost" onClick={onCancel}>
							<X className="size-4" /> Отмена
						</Button>
					</>
				) : (
					<>
						<Button size="sm" variant="outline" onClick={onCopyLink} type="button" className="whitespace-nowrap">
							{copyStatus === "success" ? (
								<Check className="size-4" />
							) : copyStatus === "error" ? (
								<XCircle className="size-4" />
							) : (
								<Copy className="size-4" />
							)}
							{copyStatus === "success" ? "Скопировано" : copyStatus === "error" ? "Ошибка" : "Скопировать ссылку"}
						</Button>
						{isAdmin && (
							<Button size="sm" variant="outline" onClick={() => setIsEdit(true)}>
								<Pencil className="size-4" /> Редактировать
							</Button>
						)}
						<Button size="sm" variant="destructive" onClick={onDeleteClick}>
							<Trash2 className="size-4" /> Удалить
						</Button>
					</>
				)}
			</div>
		</CardHeader>
	);
}
