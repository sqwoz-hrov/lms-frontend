// src/components/hr/interviews/InterviewFormDialog.tsx
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { InterviewApi, type InterviewType } from "@/api/interviewsApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pause, Play, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useResumableVideoUpload } from "@/hooks/useResumableVideoUpload";
import { VideoResponseDto } from "../../api/videosApi";

export function InterviewFormDialog({
	open,
	onOpenChange,
	hrConnection,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	hrConnection: BaseHrConnectionDto;
}) {
	const qc = useQueryClient();
	const { register, handleSubmit, setValue, watch, reset } = useForm<{ name: string; type: InterviewType }>({
		defaultValues: { name: "", type: "screening" },
	});

	const [file, setFile] = useState<File | null>(null);

	const {
		start: startUpload,
		pause: pauseUpload,
		resume: resumeUpload,
		cancel: cancelUpload,
		status: uploadStatus,
		progress: uploadProgress, // { sent, total, pct }
		error: uploadError,
	} = useResumableVideoUpload({
		onProgress: () => {},
	});

	const isUploading = uploadStatus === "uploading";
	const isPaused = uploadStatus === "paused";
	const pct = Math.round(uploadProgress.pct || 0);

	// Унифицированно извлекаем id из разных форм возврата startUpload
	const extractVideoId = useCallback((res: VideoResponseDto): string | undefined => {
		return res.id;
	}, []);

	const closeAndReset = useCallback(() => {
		// На всякий случай отменим незавершённую загрузку
		if (isUploading || isPaused) cancelUpload();
		setFile(null);
		reset({ name: "", type: "screening" });
		onOpenChange(false);
	}, [cancelUpload, isUploading, isPaused, onOpenChange, reset]);

	const m = useMutation({
		mutationFn: async (v: { name: string; type: InterviewType }) => {
			let videoId: string | undefined = undefined;

			if (file) {
				const res = await startUpload(file);
				videoId = extractVideoId(res);

				if (!videoId) {
					// если хук сигналит ошибку — пробросим её
					if (uploadStatus === "error") {
						throw new Error(uploadError ?? "Upload failed");
					}
					// иначе явно фейлимся — чтобы пользователь мог повторить
					throw new Error("Upload finished but no video id was returned.");
				}
			}

			return InterviewApi.create({
				hr_connection_id: hrConnection.id,
				name: v.name,
				type: v.type,
				video_id: videoId,
			});
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["interviews", { hr_connection_id: hrConnection.id }] });
			closeAndReset();
		},
	});

	// Поддержим явное продолжение после паузы
	const handleResume = useCallback(() => {
		if (file) resumeUpload(file);
	}, [file, resumeUpload]);

	// При закрытии через крестик/бекдроп — тоже чистим стейт
	const handleOpenChange = useCallback(
		(v: boolean) => {
			if (!v) closeAndReset();
			else onOpenChange(v);
		},
		[closeAndReset, onOpenChange],
	);

	const fileLabel = useMemo(
		() => (file ? `${file.name} (${Math.round(file.size / (1024 * 1024))} MB)` : "Файл не выбран"),
		[file],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Новое интервью</DialogTitle>
				</DialogHeader>

				<form className="space-y-4" onSubmit={handleSubmit(v => m.mutate(v))}>
					<div className="grid gap-2">
						<Label htmlFor="name">Название</Label>
						<Input id="name" placeholder="Техническое интервью #1" {...register("name", { required: true })} />
					</div>

					<div className="grid gap-2">
						<Label>Тип</Label>
						<Select defaultValue={watch("type")} onValueChange={(v: InterviewType) => setValue("type", v)}>
							<SelectTrigger>
								<SelectValue placeholder="Тип" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="screening">Screening</SelectItem>
								<SelectItem value="technical_interview">Technical</SelectItem>
								<SelectItem value="final">Final</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="video">Видео (необязательно)</Label>

						<Input
							id="video"
							type="file"
							accept="video/*"
							onChange={e => setFile(e.target.files?.[0] ?? null)}
							disabled={isUploading || isPaused || m.isPending}
						/>
						<div className="text-xs text-muted-foreground">{fileLabel}</div>

						{(isUploading || isPaused) && (
							<div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
								<div>Загрузка: {pct}%</div>
								<div className="flex items-center gap-2">
									{isUploading ? (
										<Button type="button" size="sm" variant="ghost" onClick={pauseUpload}>
											<Pause className="mr-1 h-3 w-3" /> Пауза
										</Button>
									) : (
										<Button type="button" size="sm" variant="ghost" onClick={handleResume}>
											<Play className="mr-1 h-3 w-3" /> Продолжить
										</Button>
									)}
									<Button type="button" size="sm" variant="ghost" onClick={cancelUpload}>
										<X className="mr-1 h-3 w-3" /> Отмена
									</Button>
								</div>
							</div>
						)}

						{uploadStatus === "error" && (
							<div className="text-xs text-red-600">Ошибка загрузки: {uploadError ?? "Неизвестная ошибка"}</div>
						)}
					</div>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={closeAndReset} disabled={m.isPending || isUploading}>
							Отмена
						</Button>
						<Button type="submit" disabled={m.isPending || isUploading}>
							{(m.isPending || isUploading) && <Loader2 className="mr-2 size-4 animate-spin" />} Создать
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
