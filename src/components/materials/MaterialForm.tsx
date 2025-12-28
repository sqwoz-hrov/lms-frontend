import type { MaterialResponseDto } from "@/api/materialsApi";
import type { SubjectResponseDto } from "@/api/subjectsApi";
import { SubscriptionTierSelector } from "@/components/subscriptions/SubscriptionTierSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export type MaterialFormValues = {
	subject_id: string;
	name: string;
	markdown_content?: string;
	video_file?: FileList;
	subscription_tier_ids: string[];
};

export type MaterialFormProps = {
	mode: "create" | "edit";
	subjects: SubjectResponseDto[];
	defaultSubjectId?: string;
	initial?: MaterialResponseDto | null;
	submitting?: boolean;
	onSubmit: (values: MaterialFormValues, helpers: { setUploadProgress: (n: number) => void }) => Promise<void> | void;
};

export function MaterialForm(props: MaterialFormProps) {
	const { mode, subjects, defaultSubjectId = "", initial, submitting, onSubmit } = props;

	const [serverError, setServerError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);

	const { register, handleSubmit, setValue, watch, formState, reset, trigger } = useForm<MaterialFormValues>({
		mode: "onChange",
		defaultValues: {
			subject_id: initial?.subject_id ?? defaultSubjectId,
			name: initial?.name ?? "",
			markdown_content: initial?.markdown_content ?? "",
			subscription_tier_ids: initial?.subscription_tier_ids ?? [],
			video_file: undefined,
		},
	});

	useEffect(() => {
		register("subject_id", { required: "Укажите предмет" });
		register("subscription_tier_ids");
	}, [register]);

	useEffect(() => {
		if (mode === "edit" && initial) {
			reset({
				subject_id: initial.subject_id,
				name: initial.name,
				markdown_content: initial.markdown_content ?? "",
				subscription_tier_ids: initial.subscription_tier_ids ?? [],
				video_file: undefined,
			});
		}
	}, [initial, mode, reset]);

	const videoFileList = watch("video_file");
	const hasExistingVideo = !!initial?.video_id;

	useEffect(() => {
		trigger("markdown_content");
	}, [trigger, videoFileList, hasExistingVideo]);

	async function submit(values: MaterialFormValues) {
		try {
			setServerError(null);
			setUploadProgress(0);
			await onSubmit(values, { setUploadProgress });
		} catch (e: any) {
			setServerError(e?.message || "Ошибка");
		}
	}

	return (
		<form onSubmit={handleSubmit(submit)} className="space-y-6">
			{/* subject */}
			<div className="space-y-2">
				<Label required>Предмет</Label>
				<Select value={watch("subject_id")} onValueChange={v => setValue("subject_id", v, { shouldValidate: true })}>
					<SelectTrigger className="w-full sm:w-80">
						<SelectValue placeholder="Выберите предмет" />
					</SelectTrigger>
					<SelectContent>
						{subjects.map(s => (
							<SelectItem key={s.id} value={s.id}>
								<div className="flex items-center gap-2">
									<span className="h-3 w-3 rounded-full border" style={{ backgroundColor: s.color_code }} />
									<span className="truncate max-w-[18rem]">{s.name}</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{formState.errors.subject_id && (
					<p className="text-xs text-red-600">{String(formState.errors.subject_id.message)}</p>
				)}
			</div>

			{/* name */}
			<div className="space-y-2">
				<Label htmlFor="name" required>
					Название
				</Label>
				<Input
					id="name"
					placeholder="Например: Введение в графы"
					{...register("name", { required: "Укажите название", minLength: { value: 2, message: "Минимум 2 символа" } })}
				/>
				{formState.errors.name && <p className="text-xs text-red-600">{String(formState.errors.name.message)}</p>}
			</div>

			{/* markdown */}
			<div className="space-y-2">
				<Label htmlFor="markdown_content">Markdown содержимое</Label>
				<Textarea
					id="markdown_content"
					className="min-h-[320px] font-mono text-sm"
					placeholder="# Заголовок\nВаш текст в markdown…"
					{...register("markdown_content", {
						validate: v => {
							const hasMarkdown = !!v?.trim();
							const hasVideo = hasExistingVideo || !!(videoFileList && videoFileList.length);
							return hasMarkdown || hasVideo || "Добавьте видео или markdown содержимое";
						},
					})}
				/>
				{formState.errors.markdown_content && (
					<p className="text-xs text-red-600">{String(formState.errors.markdown_content.message)}</p>
				)}
				<p className="text-xs text-muted-foreground">
					Можно заполнить markdown, прикрепить видео или сделать и то и другое. Нельзя оставлять оба поля пустыми.
				</p>
			</div>

			{/* video */}
			<div className="space-y-2">
				<Label htmlFor="video_file">Видеофайл</Label>
				<Input id="video_file" type="file" accept="video/*" disabled={!!submitting} {...register("video_file")} />
				{initial?.video_id && (
					<p className="text-xs text-muted-foreground">
						Видео уже прикреплено. Чтобы заменить его, загрузите новый файл.
					</p>
				)}
				{uploadProgress > 0 && uploadProgress < 100 && (
					<div className="text-xs text-muted-foreground">Загрузка: {uploadProgress}%</div>
				)}
			</div>

			{serverError && <div className="text-sm text-red-600">{serverError}</div>}

			{/* subscription tiers */}
			<SubscriptionTierSelector
				value={watch("subscription_tier_ids")}
				onChange={ids => setValue("subscription_tier_ids", ids, { shouldDirty: true })}
				disabled={!!submitting}
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
			</div>
		</form>
	);
}
