// components/posts/PostForm.tsx — reusable form for creating/editing posts
import type { PostResponseDto } from "@/api/postsApi";
import { SubscriptionTierSelector } from "@/components/subscriptions/SubscriptionTierSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export type PostFormValues = {
	title: string;
	markdown_content: string;
	video_file?: FileList;
	subscription_tier_ids: string[];
};

type PostFormProps = {
	mode: "create" | "edit";
	initial?: PostResponseDto | null;
	submitting?: boolean;
	onSubmit: (values: PostFormValues, helpers: { setUploadProgress: (n: number) => void }) => Promise<void> | void;
	onCancel?: () => void;
};

export function PostForm(props: PostFormProps) {
	const { mode, initial, submitting, onSubmit, onCancel } = props;
	const [serverError, setServerError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);

	const { register, handleSubmit, formState, reset, watch, setValue } = useForm<PostFormValues>({
		mode: "onChange",
		defaultValues: {
			title: initial?.title ?? "",
			markdown_content: initial?.markdown_content ?? "",
			subscription_tier_ids: initial?.subscription_tier_ids ?? [],
		},
	});

	useEffect(() => {
		if (mode === "edit" && initial) {
			reset({
				title: initial.title,
				markdown_content: initial.markdown_content,
				subscription_tier_ids: initial.subscription_tier_ids ?? [],
			});
		}
	}, [initial, mode, reset]);

	useEffect(() => {
		register("subscription_tier_ids");
	}, [register]);

	const existingVideoId = useMemo(() => {
		const candidate = initial?.video_id;
		if (!candidate) return null;
		if (typeof candidate === "string") return candidate;
		if (typeof candidate === "object" && "id" in candidate && typeof candidate.id === "string") {
			return candidate.id;
		}
		return null;
	}, [initial]);

	const tierIds = watch("subscription_tier_ids") ?? [];

	async function submit(values: PostFormValues) {
		try {
			setServerError(null);
			setUploadProgress(0);
			await onSubmit(
				{
					title: values.title.trim(),
					markdown_content: values.markdown_content,
					video_file: values.video_file,
					subscription_tier_ids: values.subscription_tier_ids,
				},
				{ setUploadProgress },
			);
		} catch (err: any) {
			setServerError(err?.message ?? "Не удалось сохранить пост");
		}
	}

	return (
		<form onSubmit={handleSubmit(submit)} className="space-y-6">
			<div className="space-y-2">
				<Label htmlFor="title">Заголовок</Label>
				<Input
					id="title"
					placeholder="Название поста"
					{...register("title", {
						required: "Укажите заголовок",
						minLength: { value: 2, message: "Минимум 2 символа" },
					})}
				/>
				{formState.errors.title && <p className="text-xs text-red-600">{formState.errors.title.message}</p>}
			</div>

			<div className="space-y-2">
				<Label htmlFor="markdown_content">Markdown содержимое</Label>
				<Textarea
					id="markdown_content"
					className="min-h-[320px] font-mono text-sm"
					placeholder="Ваш текст в markdown…"
					{...register("markdown_content", {
						required: "Контент обязателен",
						minLength: { value: 10, message: "Минимум 10 символов" },
					})}
				/>
				{formState.errors.markdown_content && (
					<p className="text-xs text-red-600">{formState.errors.markdown_content.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="video_file">Видеофайл (опционально)</Label>
				<Input id="video_file" type="file" accept="video/*" {...register("video_file")} />
				{existingVideoId && !watch("video_file") && (
					<p className="text-xs text-muted-foreground">
						Текущий видео ID: <code>{existingVideoId}</code>
					</p>
				)}
				{uploadProgress > 0 && uploadProgress < 100 && (
					<div className="text-xs text-muted-foreground">Загрузка: {uploadProgress}%</div>
				)}
			</div>

			{serverError && <div className="text-sm text-red-600">{serverError}</div>}

			<SubscriptionTierSelector
				value={tierIds}
				onChange={ids => setValue("subscription_tier_ids", ids, { shouldDirty: true, shouldValidate: true })}
				disabled={!!submitting}
				helperText="Выберите уровни, для которых пост будет доступен. Пустой список — пост скрыт для всех."
			/>

			<div className="flex items-center gap-3">
				<Button type="submit" disabled={!formState.isValid || !!submitting}>
					{submitting
						? uploadProgress > 0 && uploadProgress < 100
							? "Загрузка…"
							: "Сохранение…"
						: mode === "edit"
							? "Сохранить изменения"
							: "Создать"}
				</Button>
				{onCancel && (
					<Button type="button" variant="secondary" onClick={onCancel}>
						Отмена
					</Button>
				)}
			</div>
		</form>
	);
}
