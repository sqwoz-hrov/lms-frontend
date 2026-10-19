import type { SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export type SubscriptionTierFormValues = {
	tier: string;
	price_rubles: number;
	power: number;
	permissions: string[];
	markdown_description: string | null;
};

export type SubscriptionTierFormProps = {
	mode: "create" | "edit";
	initial?: SubscriptionTierResponseDto | null;
	submitting?: boolean;
	onSubmit: (values: SubscriptionTierFormValues) => Promise<void> | void;
	onCancel?: () => void;
};

type InternalFormValues = {
	tier: string;
	price_rubles: number;
	power: number;
	permissionsText: string;
	markdownDescription: string;
};

export function SubscriptionTierForm(props: SubscriptionTierFormProps) {
	const { mode, initial, submitting = false, onSubmit, onCancel } = props;
	const [serverError, setServerError] = useState<string | null>(null);

	const { register, handleSubmit, formState, reset, watch } = useForm<InternalFormValues>({
		mode: "onChange",
		defaultValues: {
			tier: initial?.tier ?? "",
			price_rubles: initial?.price_rubles ?? 0,
			power: initial?.power ?? 1,
			permissionsText: initial?.permissions.join("\n") ?? "",
			markdownDescription: initial?.markdown_description ?? "",
		},
	});
	const markdownDescription = register("markdownDescription");
	const watchedMarkdownDescription = watch("markdownDescription");

	useEffect(() => {
		if (mode === "edit" && initial) {
			reset({
				tier: initial.tier,
				price_rubles: initial.price_rubles,
				power: initial.power,
				permissionsText: initial.permissions.join("\n"),
				markdownDescription: initial.markdown_description ?? "",
			});
		}
	}, [initial, mode, reset]);

	async function submit(values: InternalFormValues) {
		const permissions = values.permissionsText
			.split("\n")
			.map(item => item.trim())
			.filter(Boolean);

		try {
			setServerError(null);
			await onSubmit({
				tier: values.tier.trim(),
				price_rubles: Number(values.price_rubles),
				power: Number(values.power),
				permissions,
				markdown_description: values.markdownDescription.trim() || null,
			});
		} catch (error) {
			setServerError(error instanceof Error ? error.message : "Не удалось сохранить подписку");
		}
	}

	return (
		<form onSubmit={handleSubmit(submit)} className="space-y-6">
			<div className="space-y-2">
				<Label htmlFor="tier">Название тарифа</Label>
				<Input
					id="tier"
					placeholder="Например: Стандарт"
					autoFocus
					{...register("tier", {
						required: "Укажите название тарифа",
						minLength: { value: 2, message: "Минимум 2 символа" },
					})}
				/>
				{formState.errors.tier && <p className="text-xs text-red-600">{String(formState.errors.tier.message)}</p>}
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="price_rubles">Стоимость в месяц</Label>
					<Input
						id="price_rubles"
						type="number"
						min={0}
						step={100}
						placeholder="1500"
						{...register("price_rubles", {
							required: "Укажите стоимость",
							valueAsNumber: true,
							validate: v => (v ?? 0) >= 0 || "Стоимость не может быть отрицательной",
						})}
					/>
					{formState.errors.price_rubles && (
						<p className="text-xs text-red-600">{String(formState.errors.price_rubles.message)}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="power">Грейд</Label>
					<Input
						id="power"
						type="number"
						min={1}
						step={1}
						placeholder="1"
						{...register("power", {
							required: "Укажите грейд",
							valueAsNumber: true,
							validate: v => (v ?? 0) > 0 || "Грейд должен быть больше 0",
						})}
					/>
					{formState.errors.power && <p className="text-xs text-red-600">{String(formState.errors.power.message)}</p>}
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="permissionsText">Права и возможности</Label>
				<Textarea
					id="permissionsText"
					rows={5}
					placeholder="Каждая возможность на новой строке"
					{...register("permissionsText")}
				/>
				<p className="text-xs text-muted-foreground">
					Указывайте по одному пункту на строку. Список будет отображаться пользователям.
				</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="markdownDescription">Описание тарифа</Label>
				<Tabs defaultValue="edit" className="gap-3">
					<TabsList>
						<TabsTrigger value="edit">Текст</TabsTrigger>
						<TabsTrigger value="preview">Превью</TabsTrigger>
					</TabsList>
					<TabsContent value="edit">
						<Textarea
							id="markdownDescription"
							rows={10}
							placeholder={"# Что входит в тариф\n\n- Возможность для пользователя"}
							{...markdownDescription}
						/>
					</TabsContent>
					<TabsContent value="preview">
						<div className="min-h-[244px] rounded-md border p-4">
							{watchedMarkdownDescription?.trim() ? (
								<MarkdownRenderer markdown={watchedMarkdownDescription} mode="full" />
							) : (
								<p className="text-sm text-muted-foreground">Описание тарифа пока пустое.</p>
							)}
						</div>
					</TabsContent>
				</Tabs>
				<p className="text-xs text-muted-foreground">
					Это описание показывается пользователю на странице подписки. Очистите поле, чтобы удалить описание.
				</p>
			</div>

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
