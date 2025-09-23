import { MaterialsApi } from "@/api/materialsApi";
import { SubjectsApi, type SubjectResponseDto } from "@/api/subjectsApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadVideo } from "../../api/videosApi";
import { useAuth } from "../../hooks/useAuth";

// ----- Types -----
interface FormData {
	subject_id: string;
	name: string;
	type: "article" | "video" | "other";
	markdown_content?: string;
	video_file?: FileList; // UI-only; will be uploaded to get video_id
}

// Max upload (feel free to adjust)
const MAX_VIDEO_SIZE_MB = 512; // ~512MB

export function CreateMaterialPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [params] = useSearchParams();
	const { user, loading: userLoading } = useAuth();
	const isAdmin = !!user && (user as any).role === "admin";

	const [serverError, setServerError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState<number>(0);

	const defaultSubjectId = params.get("subject_id") || "";

	const { register, handleSubmit, setValue, watch, formState } = useForm<FormData>({
		mode: "onChange",
		defaultValues: {
			subject_id: defaultSubjectId,
			name: "",
			type: "article",
			markdown_content: "",
		},
	});

	// Register subject_id so RHF can validate Select-controlled value
	useEffect(() => {
		register("subject_id", { required: "Укажите предмет" });
	}, [register]);

	// Load subjects for picker
	const {
		data: subjects,
		isLoading: subjectsLoading,
		isError: subjectsError,
		refetch: refetchSubjects,
	} = useQuery<SubjectResponseDto[]>({
		queryKey: ["subjects"],
		queryFn: SubjectsApi.list,
		staleTime: 60_000,
	});

	const type = watch("type");
	const selectedSubject = watch("subject_id");
	const videoFileList = watch("video_file");
	const videoFile = useMemo(() => (videoFileList?.length ? videoFileList[0] : null), [videoFileList]);

	useEffect(() => {
		if (type === "video") {
			// markdown not allowed for video
			setValue("markdown_content", "");
		}
	}, [type, setValue]);

	const createMut = useMutation({
		mutationFn: MaterialsApi.create,
		onSuccess: async created => {
			await queryClient.invalidateQueries({ queryKey: ["materials"] });
			await queryClient.invalidateQueries({ queryKey: ["subjects"] });
			// redirect to the list filtered by subject
			const subject_id = created.subject_id || defaultSubjectId;
			navigate(`/materials${subject_id ? `?subject_id=${subject_id}` : ""}`);
		},
		onError: (err: any) => {
			setServerError(err?.response?.data?.message || "Не удалось создать материал");
		},
	});

	async function onSubmit(values: FormData) {
		try {
			setServerError(null);
			setUploadProgress(0);

			const payload: Parameters<typeof MaterialsApi.create>[0] = {
				subject_id: values.subject_id.trim(),
				name: values.name.trim(),
				type: values.type,
			};

			if (values.type === "video") {
				if (!videoFile) {
					setServerError("Выберите видеофайл для загрузки");
					return;
				}
				if (videoFile.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
					setServerError(`Размер файла превышает ${MAX_VIDEO_SIZE_MB} МБ`);
					return;
				}

				// 1) Upload video to your storage to obtain video_id
				const videoUpload = await uploadVideo(videoFile, {
					onUploadProgress: e => {
						if (!e.total) return;
						const percent = Math.round((e.loaded / e.total) * 100);
						setUploadProgress(percent);
					},
				});
				// 2) Create material with video_id
				payload.video_id = videoUpload.id;
				// explicitly ensure no markdown is sent for video
				payload.markdown_content = undefined;
			} else {
				payload.markdown_content = values.markdown_content?.trim() || undefined;
			}

			await createMut.mutateAsync(payload);
		} catch (e: any) {
			setServerError(e?.message || "Ошибка при создании материала");
		}
	}

	if (userLoading) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}
	if (!isAdmin) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card>
					<CardContent className="py-10 text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Недостаточно прав. Только администратор может добавлять материалы.
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
				<h1 className="text-2xl font-semibold tracking-tight">Новый материал</h1>
				{isAdmin && (
					<Button variant="outline" onClick={() => navigate("/subjects/new")}>
						Создать предмет
					</Button>
				)}
			</div>

			<Card className="max-w-3xl">
				<CardHeader>
					<CardTitle className="text-base">Заполните поля</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						{/* subject_id (loaded picker) */}
						<div className="space-y-2">
							<Label>Предмет</Label>
							{subjectsLoading ? (
								<div className="text-sm text-muted-foreground">Загрузка предметов…</div>
							) : subjectsError ? (
								<div className="flex items-center gap-3">
									<span className="text-sm text-red-600">Не удалось загрузить список предметов.</span>
									<Button size="sm" variant="secondary" onClick={() => refetchSubjects()}>
										Повторить
									</Button>
								</div>
							) : (
								<Select
									value={selectedSubject}
									onValueChange={v => setValue("subject_id", v, { shouldValidate: true })}
								>
									<SelectTrigger className="w-full sm:w-80">
										<SelectValue placeholder="Выберите предмет" />
									</SelectTrigger>
									<SelectContent>
										{(subjects || []).map(s => (
											<SelectItem key={s.id} value={s.id}>
												<div className="flex items-center gap-2">
													<span className="h-3 w-3 rounded-full border" style={{ backgroundColor: s.color_code }} />
													<span className="truncate max-w-[18rem]">{s.name}</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{formState.errors.subject_id && (
								<p className="text-xs text-red-600">{formState.errors.subject_id.message as string}</p>
							)}
						</div>

						{/* name */}
						<div className="space-y-2">
							<Label htmlFor="name">Название</Label>
							<Input
								id="name"
								placeholder="Например: Введение в графы"
								{...register("name", {
									required: "Укажите название",
									minLength: { value: 2, message: "Минимум 2 символа" },
								})}
							/>
							{formState.errors.name && <p className="text-xs text-red-600">{formState.errors.name.message}</p>}
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

						{/* markdown_content (hidden/disabled for video) */}
						<div className="space-y-2">
							<Label htmlFor="markdown_content">Markdown содержимое</Label>
							<Textarea
								id="markdown_content"
								className={`min-h-[320px] font-mono text-sm ${watch("type") === "video" ? "opacity-50" : ""}`}
								placeholder={
									watch("type") === "video" ? "Недоступно для типа 'Видео'" : "# Заголовок\nВаш текст в markdown…"
								}
								disabled={watch("type") === "video"}
								{...register("markdown_content", {
									validate: v => (watch("type") === "video" ? (v ? "Для видео markdown недоступен" : true) : true),
								})}
							/>
							{formState.errors.markdown_content && (
								<p className="text-xs text-red-600">{String(formState.errors.markdown_content.message)}</p>
							)}
						</div>

						{/* video upload for type=video */}
						{watch("type") === "video" && (
							<div className="space-y-2">
								<Label htmlFor="video_file">Видеофайл</Label>
								<Input id="video_file" type="file" accept="video/*" {...register("video_file")} />
								<p className="text-xs text-muted-foreground">
									Поддерживаются файлы видео. Максимум ~{MAX_VIDEO_SIZE_MB} МБ.
								</p>
								{uploadProgress > 0 && uploadProgress < 100 && (
									<div className="text-xs text-muted-foreground">Загрузка: {uploadProgress}%</div>
								)}
							</div>
						)}

						{serverError && <div className="text-sm text-red-600">{serverError}</div>}

						<div className="flex items-center gap-3">
							<Button type="submit" disabled={!formState.isValid || createMut.isPending}>
								{createMut.isPending
									? watch("type") === "video" && uploadProgress > 0 && uploadProgress < 100
										? "Загрузка…"
										: "Сохранение…"
									: "Сохранить"}
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
