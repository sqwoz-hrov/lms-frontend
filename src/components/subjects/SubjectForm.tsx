import type { SubjectResponseDto } from "@/api/subjectsApi";
import { SubscriptionTierSelector } from "@/components/subscriptions/SubscriptionTierSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export type SubjectFormValues = {
	name: string;
	color_code: string;
	subscription_tier_ids: string[];
};

export type SubjectFormProps = {
	mode: "create" | "edit";
	initial?: SubjectResponseDto | null;
	submitting?: boolean;
	onSubmit: (values: SubjectFormValues) => Promise<void> | void;
	onCancel?: () => void;
};

const DEFAULT_COLOR = "#4f46e5";

export function SubjectForm(props: SubjectFormProps) {
	const { mode, initial, submitting = false, onSubmit, onCancel } = props;
	const [serverError, setServerError] = useState<string | null>(null);

	const { register, handleSubmit, formState, watch, setValue, reset } = useForm<SubjectFormValues>({
		mode: "onChange",
		defaultValues: {
			name: initial?.name ?? "",
			color_code: initial?.color_code ?? DEFAULT_COLOR,
			subscription_tier_ids: initial?.subscription_tier_ids ?? [],
		},
	});

	useEffect(() => {
		register("subscription_tier_ids");
	}, [register]);

	useEffect(() => {
		if (mode === "edit" && initial) {
			reset({
				name: initial.name,
				color_code: initial.color_code,
				subscription_tier_ids: initial.subscription_tier_ids ?? [],
			});
		}
	}, [initial, mode, reset]);

	const color = watch("color_code");

	async function submit(values: SubjectFormValues) {
		try {
			setServerError(null);
			await onSubmit(values);
		} catch (error: any) {
			setServerError(error?.message || "Не удалось сохранить предмет");
		}
	}

	return (
		<form onSubmit={handleSubmit(submit)} className="space-y-6">
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
				{formState.errors.name && <p className="text-xs text-red-600">{String(formState.errors.name.message)}</p>}
			</div>

			<div className="space-y-3">
				<Label htmlFor="color_code">Цвет</Label>
				<div className="flex items-center gap-3">
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
				</div>
				{formState.errors.color_code && (
					<p className="text-xs text-red-600">{String(formState.errors.color_code.message)}</p>
				)}
			</div>

			<SubscriptionTierSelector
				value={watch("subscription_tier_ids")}
				onChange={ids => setValue("subscription_tier_ids", ids, { shouldDirty: true })}
				disabled={submitting}
				helperText="Выберите подписки, которым будет доступен предмет. Без выбора предмет увидят только администраторы."
			/>

			{serverError && <div className="text-sm text-red-600">{serverError}</div>}

			<div className="flex items-center gap-3">
				<Button type="submit" disabled={!formState.isValid || submitting}>
					{submitting ? "Сохранение…" : mode === "edit" ? "Сохранить" : "Создать"}
				</Button>
				{onCancel && (
					<Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
						Отмена
					</Button>
				)}
			</div>
		</form>
	);
}
