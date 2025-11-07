import { TasksApi, type TaskStatus } from "@/api/tasksApi";
import { AuthApi, type UserResponse } from "@/api/usersApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "../../hooks/useAuth";

// —— Form Types ——
interface FormData {
	student_user_ids: string[];
	mentor_user_id: string;
	summary: string;
	markdown_content: string;
	deadline_local: string; // datetime-local input value
	priority: number | string; // keep as string in input, cast on submit
	status: TaskStatus;
}

export function CreateTaskPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user: me, loading: meLoading } = useAuth();
	const isAdmin = !!me && (me as any).role === "admin";

	const [serverError, setServerError] = useState<string | null>(null);

	// Users list (both students & mentors for now)
	const {
		data: users,
		isLoading: usersLoading,
		isError: usersError,
		refetch: refetchUsers,
	} = useQuery<UserResponse[]>({
		queryKey: ["users"],
		queryFn: AuthApi.getUsers,
		staleTime: 60_000,
	});

	const students = useMemo(() => users || [], [users]);
	const mentors = useMemo(() => users || [], [users]);

	const { register, handleSubmit, setValue, watch, formState } = useForm<FormData>({
		mode: "onChange",
		defaultValues: {
			student_user_ids: [],
			mentor_user_id: "",
			summary: "",
			markdown_content: "",
			deadline_local: "",
			priority: 3,
			status: "backlog",
		},
	});

	// Register controlled Select fields
	useEffect(() => {
		register("student_user_ids", {
			validate: value => (value && value.length > 0) || "Выберите хотя бы одного ученика",
		});
		register("mentor_user_id", { required: "Выберите наставника" });
		register("status", { required: true });
	}, [register]);

	const selectedStudents = watch("student_user_ids") ?? [];
	const selectedMentor = watch("mentor_user_id");
	const status = watch("status");

	const selectedStudentUsers = useMemo(() => {
		const ids = new Set(selectedStudents);
		return students.filter(u => ids.has(u.id));
	}, [students, selectedStudents]);

	const studentsButtonLabel = useMemo(() => {
		if (selectedStudentUsers.length === 0) return "Выберите учеников";
		if (selectedStudentUsers.length <= 2) {
			return selectedStudentUsers.map(u => u.name).join(", ");
		}
		return `Выбрано: ${selectedStudentUsers.length}`;
	}, [selectedStudentUsers]);

	const createMut = useMutation({
		mutationFn: TasksApi.createForMultipleStudents,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["tasks"] });
			navigate("/tasks");
		},
		onError: (err: any) => {
			setServerError(err?.response?.data?.message || "Не удалось создать задачу");
		},
	});

	function toIsoFromLocal(local: string): string {
		// 'YYYY-MM-DDTHH:mm' -> ISO string
		const d = new Date(local);
		if (isNaN(d.getTime())) throw new Error("Неверный формат даты");
		return d.toISOString();
	}

	async function onSubmit(values: FormData) {
		try {
			setServerError(null);
			const payload = {
				student_user_ids: Array.from(new Set(values.student_user_ids)),
				mentor_user_id: values.mentor_user_id,
				summary: values.summary.trim(),
				markdown_content: values.markdown_content.trim(),
				deadline: toIsoFromLocal(values.deadline_local),
				priority: Number(values.priority),
				status: values.status,
			} satisfies Parameters<typeof TasksApi.createForMultipleStudents>[0];

			await createMut.mutateAsync(payload);
		} catch (e: any) {
			setServerError(e?.message || "Ошибка при создании задачи");
		}
	}

	if (meLoading) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}
	if (!isAdmin) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card>
					<CardContent className="py-10 text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Недостаточно прав. Только администратор может создавать задачи.
						</p>
						<Button variant="secondary" onClick={() => navigate(-1)}>
							Назад
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">Новая задача</h1>
			</div>

			<Card className="max-w-3xl">
				<CardHeader>
					<CardTitle className="text-base">Заполните поля</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						{/* Student */}
						<div className="space-y-2">
							<Label>Ученики</Label>
							{usersLoading ? (
								<div className="text-sm text-muted-foreground">Загрузка пользователей…</div>
							) : usersError ? (
								<div className="flex items-center gap-3">
									<span className="text-sm text-red-600">Не удалось загрузить пользователей.</span>
									<Button size="sm" variant="secondary" onClick={() => refetchUsers()}>
										Повторить
									</Button>
								</div>
							) : (
								<>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button type="button" variant="outline" className="w-full sm:w-96 justify-between">
												<span className="truncate max-w-[18rem] text-left">{studentsButtonLabel}</span>
												<Badge variant="secondary">{selectedStudentUsers.length}</Badge>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-80 max-h-64 overflow-y-auto">
											<DropdownMenuLabel>Ученики</DropdownMenuLabel>
											{students.map(u => (
												<DropdownMenuCheckboxItem
													key={u.id}
													checked={selectedStudents.includes(u.id)}
													onSelect={event => event.preventDefault()}
													onCheckedChange={checked => {
														const isChecked = checked === true;
														const next = isChecked
															? Array.from(new Set([...selectedStudents, u.id]))
															: selectedStudents.filter(id => id !== u.id);
														setValue("student_user_ids", next, {
															shouldValidate: true,
															shouldDirty: true,
															shouldTouch: true,
														});
													}}
												>
													<div className="flex flex-col">
														<span className="truncate max-w-[18rem]">{u.name}</span>
														<span className="text-xs text-muted-foreground">{u.email}</span>
													</div>
												</DropdownMenuCheckboxItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
									{selectedStudentUsers.length > 0 && (
										<div className="flex flex-wrap gap-2 pt-2">
											{selectedStudentUsers.map(u => (
												<Badge key={u.id} variant="secondary">
													{u.name}
												</Badge>
											))}
										</div>
									)}
								</>
							)}
							{formState.errors.student_user_ids && (
								<p className="text-xs text-red-600">{String(formState.errors.student_user_ids.message)}</p>
							)}
						</div>

						{/* Mentor */}
						<div className="space-y-2">
							<Label>Наставник</Label>
							{usersLoading ? (
								<div className="text-sm text-muted-foreground">Загрузка пользователей…</div>
							) : usersError ? (
								<div className="flex items-center gap-3">
									<span className="text-sm text-red-600">Не удалось загрузить пользователей.</span>
									<Button size="sm" variant="secondary" onClick={() => refetchUsers()}>
										Повторить
									</Button>
								</div>
							) : (
								<Select
									value={selectedMentor}
									onValueChange={v => setValue("mentor_user_id", v, { shouldValidate: true })}
								>
									<SelectTrigger className="w-full sm:w-96">
										<SelectValue placeholder="Выберите наставника" />
									</SelectTrigger>
									<SelectContent>
										{mentors.map(u => (
											<SelectItem key={u.id} value={u.id}>
												<div className="flex items-center gap-2">
													<span className="truncate max-w-[18rem]">{u.name}</span>
													<Badge variant="secondary" className="ml-auto">
														{u.role}
													</Badge>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{formState.errors.mentor_user_id && (
								<p className="text-xs text-red-600">{String(formState.errors.mentor_user_id.message)}</p>
							)}
						</div>

						{/* Summary */}
						<div className="space-y-2">
							<Label htmlFor="summary">Краткое описание</Label>
							<Input
								id="summary"
								placeholder="Например: Реализовать двусвязный список"
								{...register("summary", {
									required: "Укажите описание",
									minLength: { value: 3, message: "Минимум 3 символа" },
								})}
							/>
							{formState.errors.summary && <p className="text-xs text-red-600">{formState.errors.summary.message}</p>}
						</div>

						{/* Markdown content */}
						<div className="space-y-2">
							<Label htmlFor="markdown_content">Текст задания (Markdown)</Label>
							<Textarea
								id="markdown_content"
								className="min-h-[280px] font-mono text-sm"
								placeholder={"# Заголовок Опишите подробности…"}
								{...register("markdown_content", { required: "Добавьте текст задания" })}
							/>
							{formState.errors.markdown_content && (
								<p className="text-xs text-red-600">{String(formState.errors.markdown_content.message)}</p>
							)}
						</div>

						{/* Deadline & Priority & Status */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="deadline_local">Дедлайн</Label>
								<Input
									id="deadline_local"
									type="datetime-local"
									{...register("deadline_local", { required: "Укажите дедлайн" })}
								/>
								{formState.errors.deadline_local && (
									<p className="text-xs text-red-600">{String(formState.errors.deadline_local.message)}</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="priority">Приоритет</Label>
								<Input
									id="priority"
									type="number"
									min={1}
									max={5}
									step={1}
									{...register("priority", {
										required: true,
										min: { value: 1, message: ">= 1" },
										max: { value: 5, message: "<= 5" },
									})}
								/>
							</div>

							<div className="space-y-2">
								<Label>Статус</Label>
								<Select
									value={status}
									onValueChange={(v: TaskStatus) => setValue("status", v, { shouldValidate: true })}
								>
									<SelectTrigger>
										<SelectValue placeholder="Выберите статус" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="backlog">Backlog</SelectItem>
										<SelectItem value="todo">To Do</SelectItem>
										<SelectItem value="in_progress">In Progress</SelectItem>
										<SelectItem value="in_review">In Review</SelectItem>
										<SelectItem value="done">Done</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{serverError && <div className="text-sm text-red-600">{serverError}</div>}

						<div className="flex items-center gap-3">
							<Button type="submit" disabled={!formState.isValid || createMut.isPending}>
								{createMut.isPending ? "Создание…" : "Создать"}
							</Button>
							<Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={createMut.isPending}>
								Отмена
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
