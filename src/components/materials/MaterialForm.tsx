// components/materials/MaterialForm.tsx — reusable create/edit
import type { MaterialResponseDto } from "@/api/materialsApi";
import type { SubjectResponseDto } from "@/api/subjectsApi";
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
	type: "article" | "video" | "other";
	markdown_content?: string;
	// UI-only
	video_file?: FileList;
};

export type MaterialFormProps = {
	mode: "create" | "edit";
	subjects: SubjectResponseDto[];
	defaultSubjectId?: string;
	initial?: MaterialResponseDto | null; // for edit
	submitting?: boolean;
	onSubmit: (values: MaterialFormValues, helpers: { setUploadProgress: (n: number) => void }) => Promise<void> | void;
};

export function MaterialForm(props: MaterialFormProps) {
	const { mode, subjects, defaultSubjectId = "", initial, submitting, onSubmit } = props;

	const [serverError, setServerError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0);

	const { register, handleSubmit, setValue, watch, formState, reset } = useForm<MaterialFormValues>({
		mode: "onChange",
		defaultValues: {
			subject_id: initial?.subject_id ?? defaultSubjectId,
			name: initial?.name ?? "",
			type: (initial?.type as MaterialFormValues["type"]) ?? "article",
			markdown_content: initial?.markdown_content ?? "",
		},
	});

	useEffect(() => {
		// keep RHF and Select in sync
		register("subject_id", { required: "Укажите предмет" });
	}, [register]);

	useEffect(() => {
		// when initial changes (e.g., loading finished), reset the form
		if (mode === "edit" && initial) {
			reset({
				subject_id: initial.subject_id,
				name: initial.name,
				type: initial.type,
				markdown_content: initial.markdown_content ?? "",
			});
		}
	}, [initial, mode, reset]);

	const type = watch("type");

	useEffect(() => {
		if (type === "video") {
			setValue("markdown_content", "");
		}
	}, [type, setValue]);

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
				<Label>Предмет</Label>
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
				<Label htmlFor="name">Название</Label>
				<Input
					id="name"
					placeholder="Например: Введение в графы"
					{...register("name", { required: "Укажите название", minLength: { value: 2, message: "Минимум 2 символа" } })}
				/>
				{formState.errors.name && <p className="text-xs text-red-600">{String(formState.errors.name.message)}</p>}
			</div>

			{/* type */}
			<div className="space-y-2">
				<Label>Тип материала</Label>
				<Select value={watch("type")} onValueChange={(v: any) => setValue("type", v)}>
					<SelectTrigger className="w-64">
						<SelectValue placeholder="Выберите тип" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="article">Статья</SelectItem>
						<SelectItem value="video">Видео</SelectItem>
						<SelectItem value="other">Другое</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* markdown */}
			<div className="space-y-2">
				<Label htmlFor="markdown_content">Markdown содержимое</Label>
				<Textarea
					id="markdown_content"
					className={`min-h-[320px] font-mono text-sm ${watch("type") === "video" ? "opacity-50" : ""}`}
					placeholder={watch("type") === "video" ? "Недоступно для типа 'Видео'" : "# Заголовок\nВаш текст в markdown…"}
					disabled={watch("type") === "video"}
					{...register("markdown_content", {
						validate: v => (watch("type") === "video" ? (v ? "Для видео markdown недоступен" : true) : true),
					})}
				/>
				{formState.errors.markdown_content && (
					<p className="text-xs text-red-600">{String(formState.errors.markdown_content.message)}</p>
				)}
			</div>

			{/* video (only for type=video) */}
			{watch("type") === "video" && (
				<div className="space-y-2">
					<Label htmlFor="video_file">Видеофайл</Label>
					<Input id="video_file" type="file" accept="video/*" {...register("video_file")} />
					{uploadProgress > 0 && uploadProgress < 100 && (
						<div className="text-xs text-muted-foreground">Загрузка: {uploadProgress}%</div>
					)}
				</div>
			)}

			{serverError && <div className="text-sm text-red-600">{serverError}</div>}

			<div className="flex items-center gap-3">
				<Button type="submit" disabled={!formState.isValid || !!submitting}>
					{submitting
						? watch("type") === "video" && uploadProgress > 0 && uploadProgress < 100
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
// =====================
// routes usage example
// =====================
// In your router:
// <Route path="/materials/new" element={<UpsertMaterialPage />} />
// <Route path="/materials/:id/edit" element={<UpsertMaterialPage />} />
