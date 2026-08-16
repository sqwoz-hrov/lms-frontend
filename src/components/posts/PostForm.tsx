// components/posts/PostForm.tsx — reusable form for creating/editing posts
import type { PostResponseDto } from "@/api/postsApi";
import { SubscriptionTierSelector } from "@/components/subscriptions/SubscriptionTierSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export type PostFormValues = {
	title: string;
	markdown_content: string;
	video_file?: FileList;
	minimal_tier_id: string;
	generate_slug: boolean;
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
			minimal_tier_id: initial?.minimal_tier_id ?? "",
			generate_slug: false,
		},
	});

	useEffect(() => {
		if (mode === "edit" && initial) {
			reset({
				title: initial.title,
				markdown_content: initial.markdown_content,
				minimal_tier_id: initial.minimal_tier_id ?? "",
				generate_slug: false,
			});
		}
	}, [initial, mode, reset]);

	useEffect(() => {
		register("minimal_tier_id", { required: "Выберите минимальный уровень" });
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

	async function submit(values: PostFormValues) {
		try {
			setServerError(null);
			setUploadProgress(0);
			await onSubmit(
				{
					title: values.title.trim(),
					markdown_content: values.markdown_content,
					video_file: values.video_file,
					minimal_tier_id: values.minimal_tier_id,
					generate_slug: values.generate_slug,
				},
				{ setUploadProgress },
			);
		} catch (error: unknown) {
			const responseDescription = isAxiosError<{ description?: string }>(error)
				? error.response?.data?.description
				: undefined;
			setServerError(responseDescription ?? (error instanceof Error ? error.message : "Не удалось сохранить пост"));
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

			<div className="space-y-2 rounded-lg border p-4">
				{initial?.slug ? (
					<>
						<Label>Постоянная ссылка</Label>
						<code className="block break-all text-sm text-muted-foreground">/posts/{initial.slug}</code>
					</>
				) : (
					<>
						<div className="flex items-center gap-2">
							<input
								id="generate_slug"
								type="checkbox"
								className="h-4 w-4 rounded border-input"
								disabled={!!submitting}
								{...register("generate_slug")}
							/>
							<Label htmlFor="generate_slug">Создать постоянную ссылку</Label>
						</div>
						<p className="text-xs text-muted-foreground">
							Ссылка создаётся из названия один раз. Её нельзя удалить, и она не изменится при переименовании поста.
						</p>
					</>
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
				value={watch("minimal_tier_id")}
				onChange={id => setValue("minimal_tier_id", id, { shouldDirty: true, shouldValidate: true })}
				disabled={!!submitting}
				helperText="Выберите минимальный уровень. Пост будет доступен этому уровню и всем уровням выше."
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
