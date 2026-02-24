import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoProcessingPreview } from "@/components/video/VideoProcessingPreview";
import { cn } from "@/lib/utils";
import type { GetByIdVideoResponseDto } from "@/api/videosApi";
import type { UploadPhase } from "../../lib";

export type VideoDropZoneProps = {
	/** Whether an upload is currently in progress */
	isUploading: boolean;
	/** Upload progress 0–100 */
	progressPct: number;
	/** Error message from a failed upload */
	uploadError: string | null;
	/** Resolved video object once upload completes */
	uploadedVideo: { id: string; filename?: string | null; mime_type?: string | null; phase?: string | null } | null;
	/** Additional video details fetched after upload (for preview URL etc.) */
	uploadedVideoDetails: GetByIdVideoResponseDto | null | undefined;
	previewError: boolean;
	livePhase?: UploadPhase;
	/** Called with the chosen File */
	onFileSelected: (file: File) => void;
};

export function VideoDropZone({
	isUploading,
	progressPct,
	uploadError,
	uploadedVideo,
	uploadedVideoDetails,
	previewError,
	livePhase,
	onFileSelected,
}: VideoDropZoneProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [isDragActive, setIsDragActive] = useState(false);

	const openPicker = () => fileInputRef.current?.click();

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) onFileSelected(file);
		if (event.target) event.target.value = "";
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			openPicker();
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(true);
		event.dataTransfer.dropEffect = "copy";
	};

	const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);
		const file = event.dataTransfer.files?.[0];
		if (file) onFileSelected(file);
	};

	const hasUploadedVideo = Boolean(uploadedVideo?.id);
	const previewUrl = uploadedVideoDetails?.video_url;
	const previewMime = uploadedVideo?.mime_type ?? uploadedVideoDetails?.mime_type ?? "video/mp4";
	const uploadedFileLabel = uploadedVideo?.filename ?? uploadedVideoDetails?.filename ?? null;
	const previewHelperText = previewError
		? "Не удалось получить ссылку на видео. Мы скоро попробуем ещё раз автоматически."
		: previewUrl
			? "Если превью не появилось, просто дождитесь завершения обработки — статус обновляется автоматически."
			: "Видео проходит внутренние шаги (конвертация, хеширование, загрузка). Ссылка появится автоматически.";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Видео интервью</CardTitle>
			</CardHeader>
			<CardContent className="space-y-5">
				<input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleInputChange} />

				{hasUploadedVideo ? (
					<VideoProcessingPreview
						title="Видео обрабатывается"
						description="Следим за статусом файла — как только он будет готов, появится ссылка для просмотра."
						filename={uploadedFileLabel}
						src={previewUrl}
						mimeType={previewMime}
						phase={livePhase ?? uploadedVideoDetails?.phase ?? uploadedVideo?.phase ?? undefined}
						helperText={previewHelperText}
						helperTextTone={previewError ? "error" : "default"}
						actions={
							<>
								<Button size="sm" variant="outline" onClick={openPicker}>
									<UploadCloud className="mr-2 size-4" />
									Заменить видео
								</Button>
							</>
						}
					/>
				) : (
					<>
						<div
							role="button"
							tabIndex={0}
							className={cn(
								"border-muted-foreground/30 hover:border-muted-foreground/60 bg-card text-card-foreground flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
								isDragActive && "border-primary bg-primary/5",
							)}
							onClick={openPicker}
							onKeyDown={handleKeyDown}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
						>
							<UploadCloud className="mb-3 size-10 text-muted-foreground" />
							<p className="text-base font-medium">Перетащите видео сюда или выберите файл</p>
							<p className="text-sm text-muted-foreground">Разрешены все форматы видео, размер ограничен тарифом.</p>
							<Button className="mt-4" type="button" variant="outline">
								Выбрать файл
							</Button>
						</div>

						{isUploading && (
							<div className="space-y-2">
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>Прогресс загрузки</span>
									<span>{progressPct}%</span>
								</div>
								<div className="h-2 w-full rounded-full bg-muted">
									<div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
								</div>
							</div>
						)}

						{uploadError && <p className="text-sm text-destructive">Ошибка загрузки: {uploadError}</p>}
					</>
				)}
			</CardContent>
		</Card>
	);
}
