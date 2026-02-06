import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type VideoUploadStatus = "idle" | "selecting" | "uploading" | "completed" | "error" | "canceled";

export type VideoUploadProgress = {
	sent: number;
	total: number;
	pct: number;
};

export type VideoUploadState = {
	status: VideoUploadStatus;
	progress: VideoUploadProgress;
	error: string | null;
	file: File | null;
	videoId: string | null;
};

export type VideoUploadContextValue = VideoUploadState & {
	/** Start upload with a file */
	startUpload: (file: File) => Promise<string | null>;
	/** Cancel ongoing upload */
	cancelUpload: () => void;
	/** Reset state to idle */
	reset: () => void;
	/** Set file without starting upload */
	setFile: (file: File | null) => void;
};

const VideoUploadContext = createContext<VideoUploadContextValue | null>(null);

export function useVideoUploadContext() {
	const ctx = useContext(VideoUploadContext);
	if (!ctx) {
		throw new Error("useVideoUploadContext must be used within a VideoUploadProvider");
	}
	return ctx;
}

export type VideoUploadProviderProps = {
	children: ReactNode;
	/** Mock mode for testing without backend */
	mockMode?: boolean;
	/** Mock upload duration in ms (default: 3000) */
	mockDuration?: number;
	/** Mock error probability 0-1 (default: 0) */
	mockErrorProbability?: number;
	/** Callback when upload completes */
	onUploadComplete?: (videoId: string, file: File) => void;
	/** Callback when upload fails */
	onUploadError?: (error: string, file: File) => void;
	/** Callback when upload starts */
	onUploadStart?: (file: File) => void;
};

const initialProgress: VideoUploadProgress = { sent: 0, total: 0, pct: 0 };

export function VideoUploadStateProvider({
	children,
	mockMode = false,
	mockDuration = 3000,
	mockErrorProbability = 0,
	onUploadComplete,
	onUploadError,
	onUploadStart,
}: VideoUploadProviderProps) {
	const [status, setStatus] = useState<VideoUploadStatus>("idle");
	const [progress, setProgress] = useState<VideoUploadProgress>(initialProgress);
	const [error, setError] = useState<string | null>(null);
	const [file, setFileState] = useState<File | null>(null);
	const [videoId, setVideoId] = useState<string | null>(null);
	const [abortController, setAbortController] = useState<AbortController | null>(null);

	const reset = useCallback(() => {
		abortController?.abort();
		setStatus("idle");
		setProgress(initialProgress);
		setError(null);
		setFileState(null);
		setVideoId(null);
		setAbortController(null);
	}, [abortController]);

	const setFile = useCallback((f: File | null) => {
		setFileState(f);
		if (f) {
			setStatus("selecting");
			setError(null);
		} else {
			setStatus("idle");
		}
	}, []);

	const cancelUpload = useCallback(() => {
		abortController?.abort();
		setStatus("canceled");
		setAbortController(null);
	}, [abortController]);

	const startMockUpload = useCallback(
		async (uploadFile: File, signal: AbortSignal): Promise<string> => {
			const totalSize = uploadFile.size;
			const steps = 20;
			const stepDuration = mockDuration / steps;

			for (let i = 1; i <= steps; i++) {
				if (signal.aborted) {
					throw new Error("Upload canceled");
				}

				await new Promise(resolve => setTimeout(resolve, stepDuration));

				const sent = Math.round((totalSize * i) / steps);
				const pct = Math.round((i / steps) * 100);
				setProgress({ sent, total: totalSize, pct });
			}

			// Simulate random error based on probability
			if (Math.random() < mockErrorProbability) {
				throw new Error("Mock upload error: simulated failure");
			}

			// Return a mock video ID
			return `mock-video-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		},
		[mockDuration, mockErrorProbability],
	);

	const startRealUpload = useCallback(
		async (uploadFile: File, signal: AbortSignal): Promise<string> => {
			// Dynamic import to avoid loading the API in mock mode
			const { VideosApi } = await import("@/api/videosApi");

			const result = await VideosApi.uploadVideoResumable(uploadFile, {
				signal,
				onTotalProgress: ({ sentBytes, totalBytes }) => {
					const pct = totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0;
					setProgress({ sent: sentBytes, total: totalBytes, pct });
				},
			});

			return result.id;
		},
		[],
	);

	const startUpload = useCallback(
		async (uploadFile: File): Promise<string | null> => {
			// Cancel any existing upload
			abortController?.abort();

			const controller = new AbortController();
			setAbortController(controller);

			setFileState(uploadFile);
			setStatus("uploading");
			setError(null);
			setVideoId(null);
			setProgress({ sent: 0, total: uploadFile.size, pct: 0 });

			onUploadStart?.(uploadFile);

			try {
				const id = mockMode
					? await startMockUpload(uploadFile, controller.signal)
					: await startRealUpload(uploadFile, controller.signal);

				setVideoId(id);
				setStatus("completed");
				onUploadComplete?.(id, uploadFile);
				return id;
			} catch (err: any) {
				if (controller.signal.aborted) {
					setStatus("canceled");
					return null;
				}

				const errorMessage = err?.message ?? "Upload failed";
				setError(errorMessage);
				setStatus("error");
				onUploadError?.(errorMessage, uploadFile);
				return null;
			}
		},
		[abortController, mockMode, startMockUpload, startRealUpload, onUploadStart, onUploadComplete, onUploadError],
	);

	const value = useMemo<VideoUploadContextValue>(
		() => ({
			status,
			progress,
			error,
			file,
			videoId,
			startUpload,
			cancelUpload,
			reset,
			setFile,
		}),
		[status, progress, error, file, videoId, startUpload, cancelUpload, reset, setFile],
	);

	return <VideoUploadContext.Provider value={value}>{children}</VideoUploadContext.Provider>;
}
