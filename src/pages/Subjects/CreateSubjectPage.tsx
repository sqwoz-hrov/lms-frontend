import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SubjectsApi } from "@/api/subjectsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useState } from "react";

// --- Types ---
interface FormData {
	name: string;
	color_code: string; // hex color like #RRGGBB
}

export function CreateSubjectPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: user, isLoading: userLoading } = useCurrentUser();
	const isAdmin = !!user && (user as any).role === "admin";

	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<FormData>({
		mode: "onChange",
		defaultValues: {
			name: "",
			color_code: "#4f46e5", // indigo-ish default
		},
	});
	const { register, handleSubmit, formState, watch, setValue } = form;
	const color = watch("color_code");

	const { mutateAsync, isPending } = useMutation({
		mutationFn: SubjectsApi.create,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["subjects"] });
			navigate("/subjects");
		},
		onError: (err: any) => {
			setServerError(err?.response?.data?.message || "Не удалось создать тему");
		},
	});

	async function onSubmit(data: FormData) {
		setServerError(null);
		await mutateAsync({ name: data.name.trim(), color_code: normalizeHex(data.color_code) });
	}

	// Ensure # and uppercase 6-digit hex
	function normalizeHex(value: string) {
		const v = value.startsWith("#") ? value.slice(1) : value;
		return `#${v.toUpperCase()}`;
	}

	// --- Guards ---
	if (userLoading) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}
	if (!isAdmin) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card>
					<CardContent className="py-10 text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Недостаточно прав. Только администратор может добавлять темы.
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
				<h1 className="text-2xl font-semibold tracking-tight">Новая тема</h1>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle className="text-base">Заполните поля</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="name">Название</Label>
							<Input
								id="name"
								placeholder="Например: Алгоритмы"
								autoFocus
								{...register("name", {
									required: "Укажите название",
									minLength: { value: 2, message: "Минимум 2 символа" },
								})}
							/>
							{formState.errors.name && <p className="text-xs text-red-600">{formState.errors.name.message}</p>}
						</div>

						<div className="space-y-3">
							<Label htmlFor="color_code">Цвет</Label>

							{/* Color picker + hex input side-by-side */}
							<div className="flex items-center gap-3">
								{/* Native color picker: allows choosing any color; stays in sync with hex field */}
								<input
									type="color"
									id="color_code"
									className="h-10 w-12 cursor-pointer rounded-md border"
									value={color}
									onChange={e => setValue("color_code", e.target.value, { shouldValidate: true })}
									aria-label="Выбрать цвет"
								/>

								<Input
									placeholder="#RRGGBB"
									value={color}
									{...register("color_code", {
										validate: v => /^#([0-9A-Fa-f]{6})$/.test(v) || "Введите HEX вида #RRGGBB",
									})}
								/>

								{/* Live preview badge */}
								<div
									className="ml-auto h-8 w-8 rounded-full ring-1 ring-black/10"
									style={{ backgroundColor: color }}
									aria-label="Предпросмотр цвета"
									title={color}
								/>
							</div>
							{formState.errors.color_code && (
								<p className="text-xs text-red-600">{String(formState.errors.color_code.message)}</p>
							)}
						</div>

						{serverError && <div className="text-sm text-red-600">{serverError}</div>}

						<div className="flex items-center gap-3">
							<Button type="submit" disabled={!formState.isValid || isPending}>
								{isPending ? "Сохранение…" : "Сохранить"}
							</Button>
							<Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={isPending}>
								Отмена
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
