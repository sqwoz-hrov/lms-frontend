import { useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { Upload, X, CheckCircle, AlertCircle, Loader2, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VideoUploadState, VideoUploadProgress } from "@/hooks/useVideoUpload";

export type VideoUploadInputProps = {
	/** Current upload state */
	state: VideoUploadState;
	/** Called when user selects a file */
	onFileSelect: (file: File) => void;
	/** Called to start the upload */
	onStartUpload?: (file: File) => void;
	/** Called to cancel the upload */
	onCancel?: () => void;
	/** Called to reset/clear */
	onReset?: () => void;
	/** Whether to auto-start upload on file select */
	autoUpload?: boolean;
	/** Accepted file types */
	accept?: string;
	/** Disabled state */
	disabled?: boolean;
	/** Custom class name */
	className?: string;
	/** Label text */
	label?: string;
	/** Help text shown below the input */
	helpText?: string;
	/** Show file name after selection */
	showFileName?: boolean;
};

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function ProgressBar({ progress }: { progress: VideoUploadProgress }) {
	return (
		<div className="w-full">
			<div className="flex justify-between text-xs text-muted-foreground mb-1">
				<span>{progress.pct}%</span>
				<span>
					{formatFileSize(progress.sent)} / {formatFileSize(progress.total)}
				</span>
			</div>
			<div className="h-2 bg-muted rounded-full overflow-hidden">
				<div
					className="h-full bg-primary transition-all duration-300 ease-out"
					style={{ width: `${progress.pct}%` }}
				/>
			</div>
		</div>
	);
}

export function VideoUploadInput({
	state,
	onFileSelect,
	onStartUpload,
	onCancel,
	onReset,
	autoUpload = true,
	accept = "video/*",
	disabled = false,
	className,
	label = "Загрузить видео",
	helpText,
	showFileName = true,
}: VideoUploadInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleClick = useCallback(() => {
		if (!disabled && state.status !== "uploading") {
			inputRef.current?.click();
		}
	}, [disabled, state.status]);

	const handleFileChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				onFileSelect(file);
				if (autoUpload && onStartUpload) {
					onStartUpload(file);
				}
			}
			// Reset input value so the same file can be selected again
			e.target.value = "";
		},
		[onFileSelect, autoUpload, onStartUpload],
	);

	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (disabled || state.status === "uploading") return;

			const file = e.dataTransfer.files?.[0];
			if (file && file.type.startsWith("video/")) {
				onFileSelect(file);
				if (autoUpload && onStartUpload) {
					onStartUpload(file);
				}
			}
		},
		[disabled, state.status, onFileSelect, autoUpload, onStartUpload],
	);

	const isIdle = state.status === "idle";
	const isSelecting = state.status === "selecting";
	const isUploading = state.status === "uploading";
	const isCompleted = state.status === "completed";
	const isError = state.status === "error";
	const isCanceled = state.status === "canceled";

	const canSelectFile = !disabled && !isUploading;
	const showUploadButton = isSelecting && !autoUpload && state.file && onStartUpload;

	return (
		<div className={cn("space-y-2", className)}>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleFileChange}
				className="hidden"
				disabled={disabled || isUploading}
			/>

			<div
				onClick={canSelectFile ? handleClick : undefined}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				className={cn(
					"relative flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition-all",
					canSelectFile && "cursor-pointer hover:border-primary hover:bg-muted/50",
					isUploading && "border-primary bg-primary/5",
					isCompleted && "border-green-500 bg-green-50 dark:bg-green-950/20",
					isError && "border-destructive bg-destructive/5",
					disabled && "opacity-50 cursor-not-allowed",
				)}
			>
				{/* Idle state */}
				{isIdle && (
					<>
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Upload className="h-6 w-6 text-muted-foreground" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium">{label}</p>
							<p className="text-xs text-muted-foreground mt-1">Перетащите файл или нажмите для выбора</p>
						</div>
                        <div>
			                {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
                        </div>
					</>
				)}

				{/* File selected, waiting to upload */}
				{isSelecting && state.file && (
					<>
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Film className="h-6 w-6 text-muted-foreground" />
						</div>
						{showFileName && (
							<div className="text-center">
								<p className="text-sm font-medium truncate max-w-[200px]">{state.file.name}</p>
								<p className="text-xs text-muted-foreground">{formatFileSize(state.file.size)}</p>
							</div>
						)}
						{showUploadButton && (
							<Button size="sm" onClick={() => onStartUpload(state.file!)}>
								Загрузить
							</Button>
						)}
					</>
				)}

				{/* Uploading */}
				{isUploading && (
					<>
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<Loader2 className="h-6 w-6 text-primary animate-spin" />
						</div>
						{showFileName && state.file && (
							<p className="text-sm font-medium truncate max-w-[200px]">{state.file.name}</p>
						)}
						<div className="w-full max-w-xs">
							<ProgressBar progress={state.progress} />
						</div>
						{onCancel && (
							<Button variant="ghost" size="sm" onClick={onCancel}>
								<X className="h-4 w-4 mr-1" />
								Отменить
							</Button>
						)}
					</>
				)}

				{/* Completed */}
				{isCompleted && (
					<>
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
							<CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
						</div>
						<div className="text-center">
							{showFileName && state.file && (
								<p className="text-sm font-medium truncate max-w-[200px]">{state.file.name}</p>
							)}
							<p className="text-xs text-green-600 dark:text-green-400">Видео загружено</p>
						</div>
						{onReset && (
							<Button variant="ghost" size="sm" onClick={onReset}>
								Загрузить другое
							</Button>
						)}
					</>
				)}

				{/* Error */}
				{isError && (
					<>
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
							<AlertCircle className="h-6 w-6 text-destructive" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-destructive">Ошибка загрузки</p>
							{state.error && <p className="text-xs text-muted-foreground mt-1">{state.error}</p>}
						</div>
						{onReset && (
							<Button variant="ghost" size="sm" onClick={onReset}>
								Попробовать снова
							</Button>
						)}
					</>
				)}

				{/* Canceled */}
				{isCanceled && (
					<>
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<X className="h-6 w-6 text-muted-foreground" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium">Загрузка отменена</p>
						</div>
						{onReset && (
							<Button variant="ghost" size="sm" onClick={onReset}>
								Начать заново
							</Button>
						)}
					</>
				)}
			</div>

		</div>
	);
}
