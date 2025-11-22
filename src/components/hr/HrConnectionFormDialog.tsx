// src/components/hr/HrConnectionFormDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller, useForm } from "react-hook-form";
import { usePermissions } from "@/hooks/usePermissions";
import { HrConnectionsApi, type BaseHrConnectionDto, type HrStatus } from "@/api/hrConnectionsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import type { UserResponse } from "@/api/usersApi";
import { useEffect, useMemo } from "react";
import { useUsersLoader } from "@/components/users/UsersLoader";

export type HrConnectionFormDialogProps = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	initial?: BaseHrConnectionDto | null;
};

type FormValues = {
	name: string;
	status: HrStatus;
	chat_link: string;
	student_user_id?: string;
};

const STATUS_OPTIONS: { value: HrStatus; label: string }[] = [
	{ value: "waiting_us", label: "Ждём нас" },
	{ value: "waiting_hr", label: "Ждём HR" },
	{ value: "rejected", label: "Отказ" },
	{ value: "offer", label: "Оффер" },
];

export function HrConnectionFormDialog({ open, onOpenChange, initial }: HrConnectionFormDialogProps) {
	const { me, isAdmin } = usePermissions();
	const qc = useQueryClient();

	const { users, isLoading: usersLoading, isError: usersError } = useUsersLoader();

	const students: UserResponse[] = useMemo(() => (users ?? []).filter(u => u.role === "user"), [users]);

	const { register, handleSubmit, control, reset, formState } = useForm<FormValues>({
		defaultValues: {
			name: initial?.name ?? "",
			status: (initial?.status as HrStatus) ?? "waiting_us",
			chat_link: initial?.chat_link ?? "",
			// админ — выбирает из списка; пользователь — подставляем себя
			student_user_id: isAdmin ? (initial?.student_user_id ?? undefined) : me?.id,
		},
	});

	// пересбрасываем форму при смене initial / роли / пользователя
	useEffect(() => {
		reset({
			name: initial?.name ?? "",
			status: (initial?.status as HrStatus) ?? "waiting_us",
			chat_link: initial?.chat_link ?? "",
			student_user_id: isAdmin ? (initial?.student_user_id ?? undefined) : me?.id,
		});
	}, [initial, isAdmin, me?.id, reset]);

	const m = useMutation({
		mutationFn: async (values: FormValues) => {
			if (initial) {
				return HrConnectionsApi.update({
					id: initial.id,
					name: values.name,
					status: values.status,
					chat_link: values.chat_link,
					student_user_id: isAdmin ? values.student_user_id : me?.id,
				});
			}
			return HrConnectionsApi.create({
				name: values.name,
				status: values.status,
				chat_link: values.chat_link,
				student_user_id: isAdmin ? (values.student_user_id as string) : (me?.id as string),
			});
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["hr-connections"] });
			onOpenChange(false);
		},
	});

	const onSubmit = (values: FormValues) => m.mutate(values);

	// утилита для подписи студента
	const studentLabel = (u: UserResponse) => `${u.name}${u.telegram_username ? ` — @${u.telegram_username}` : ""}`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>{initial ? "Редактировать контакт" : "Новый контакт"}</DialogTitle>
				</DialogHeader>

				<form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-2">
						<Label htmlFor="name">Название / Компания</Label>
						<Input id="name" placeholder="Acme Inc." {...register("name", { required: true })} />
						{formState.errors.name && <span className="text-xs text-destructive">Укажите название</span>}
					</div>

					<div className="grid gap-2">
						<Label>Статус</Label>
						<Controller
							name="status"
							control={control}
							rules={{ required: true }}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger>
										<SelectValue placeholder="Выберите статус" />
									</SelectTrigger>
									<SelectContent>
										{STATUS_OPTIONS.map(o => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{formState.errors.status && <span className="text-xs text-destructive">Выберите статус</span>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="chat_link">Ссылка на чат</Label>
						<Input id="chat_link" placeholder="https://t.me/..." {...register("chat_link")} />
					</div>

					{isAdmin ? (
						<div className="grid gap-2">
							<Label>Студент</Label>
							<Controller
								name="student_user_id"
								control={control}
								rules={{ required: true }}
								render={({ field }) => (
									<Select
										// ВАЖНО: пустое значение — undefined, чтобы placeholder работал и не было ошибки Select.Item
										value={field.value || undefined}
										onValueChange={field.onChange}
										disabled={usersLoading || usersError}
									>
										<SelectTrigger>
											<SelectValue placeholder={usersLoading ? "Загрузка…" : "Выберите студента"} />
										</SelectTrigger>
										<SelectContent>
											{students.map(s => (
												<SelectItem key={s.id} value={s.id}>
													{studentLabel(s)}
												</SelectItem>
											))}
											{/* если в initial пришёл id, которого нет среди студентов */}
											{!usersLoading && !students.find(s => s.id === field.value) && field.value && (
												<SelectItem value={field.value} disabled>
													Неизвестный студент (id: {field.value})
												</SelectItem>
											)}
										</SelectContent>
									</Select>
								)}
							/>
							{formState.errors.student_user_id && <span className="text-xs text-destructive">Выберите студента</span>}
						</div>
					) : (
						// не-админам поле не показываем: всегда текущий пользователь
						<input type="hidden" {...register("student_user_id")} value={me?.id} readOnly />
					)}

					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Отмена
						</Button>
						<Button type="submit" disabled={m.isPending}>
							{m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Сохранить
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
