import { signup, type SignupDto } from "@/api/usersApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "../../hooks/useAuth";

// ——— Types ———
interface FormData {
	role: SignupDto["role"];
	name: string;
	email: string;
	telegram_username: string; // may include leading @ — we'll normalize
}

export function CreateUserPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user: me, loading: meLoading } = useAuth();
	const isAdmin = !!me && (me as any).role === "admin";

	const { register, handleSubmit, setValue, watch, formState } = useForm<FormData>({
		mode: "onChange",
		defaultValues: {
			role: "user",
			name: "",
			email: "",
			telegram_username: "",
		},
	});

	const [serverError, setServerError] = useState<string | null>(null);
	const [_, setCreatedId] = useState<string | null>(null);

	useEffect(() => {
		// normalize telegram handle on blur
		const handler = () => {
			const v = watch("telegram_username");
			if (!v) return;
			const normalized = normalizeTelegram(v);
			if (normalized !== v) setValue("telegram_username", normalized, { shouldValidate: true });
		};
		// sadly RHF doesn't expose onBlur here; we'll rely on submit normalization too
		return () => void handler;
	}, [setValue, watch]);

	const signupMut = useMutation({
		mutationFn: signup,
		onSuccess: async user => {
			setCreatedId(user.id);
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			navigate("/users");
		},
		onError: (err: any) => {
			setServerError(err?.response?.data?.message || "Не удалось создать пользователя");
		},
	});

	async function onSubmit(values: FormData) {
		setServerError(null);

		const payload: SignupDto = {
			role: values.role,
			name: values.name.trim(),
			email: values.email.trim(),
			telegram_username: normalizeTelegram(values.telegram_username.trim()),
		};

		await signupMut.mutateAsync(payload);
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
							Недостаточно прав. Только администратор может создавать пользователей.
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
				<h1 className="text-2xl font-semibold tracking-tight">Создание пользователя</h1>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle className="text-base">Заполните поля</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						{/* Role */}
						<div className="space-y-2">
							<Label>Роль</Label>
							<Select value={watch("role")} onValueChange={(v: any) => setValue("role", v, { shouldValidate: true })}>
								<SelectTrigger className="w-48">
									<SelectValue placeholder="Выберите роль" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="user">Пользователь</SelectItem>
									<SelectItem value="admin">Администратор</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Name */}
						<div className="space-y-2">
							<Label htmlFor="name">Имя</Label>
							<Input
								id="name"
								placeholder="Например: Иван Иванов"
								autoFocus
								{...register("name", {
									required: "Укажите имя",
									minLength: { value: 2, message: "Минимум 2 символа" },
								})}
							/>
							{formState.errors.name && <p className="text-xs text-red-600">{formState.errors.name.message}</p>}
						</div>

						{/* Email */}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@example.com"
								{...register("email", {
									required: "Укажите email",
									pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Некорректный email" },
								})}
							/>
							{formState.errors.email && <p className="text-xs text-red-600">{formState.errors.email.message}</p>}
						</div>

						{/* Telegram username */}
						<div className="space-y-2">
							<Label htmlFor="telegram_username">Telegram</Label>
							<Input
								id="telegram_username"
								placeholder="@username"
								{...register("telegram_username", {
									required: "Укажите Telegram username",
									validate: v =>
										/^@?[A-Za-z0-9_]{5,32}$/.test(v) || "Формат: @username (5–32 символов, латиница/цифры/_)",
								})}
							/>
							<p className="text-xs text-muted-foreground">Можно указывать с @ или без — мы нормализуем.</p>
							{formState.errors.telegram_username && (
								<p className="text-xs text-red-600">{String(formState.errors.telegram_username.message)}</p>
							)}
						</div>

						{serverError && <div className="text-sm text-red-600">{serverError}</div>}

						<div className="flex items-center gap-3">
							<Button type="submit" disabled={!formState.isValid || signupMut.isPending}>
								{signupMut.isPending ? "Создание…" : "Создать"}
							</Button>
							<Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={signupMut.isPending}>
								Отмена
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

// ——— Utils ———
function normalizeTelegram(v: string) {
	const trimmed = v.trim();
	const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
	return withoutAt;
}
