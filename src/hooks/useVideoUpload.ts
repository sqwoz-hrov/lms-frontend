import { useState, useCallback, useMemo, useRef } from "react";
import { VideosApi } from "@/api/videosApi";

type VideoUploadResult = Awaited<ReturnType<typeof VideosApi.uploadVideoResumable>>;

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
	video: VideoUploadResult | null;
};

export type UseVideoUploadOptions = {
	/** Mock mode for testing without backend */
	mockMode?: boolean;
	/** Mock upload duration in ms (default: 3000) */
	mockDuration?: number;
	/** Mock error probability 0-1 (default: 0) */
	mockErrorProbability?: number;
	/** Callback when upload completes */
	onUploadComplete?: (video: VideoUploadResult, file: File) => void;
	/** Callback when upload fails */
	onUploadError?: (error: string, file: File) => void;
	/** Callback when upload starts */
	onUploadStart?: (file: File) => void;
	/** Callback on progress update */
	onProgress?: (progress: VideoUploadProgress) => void;
};

const initialProgress: VideoUploadProgress = { sent: 0, total: 0, pct: 0 };

/**
 * Hook for managing video upload state.
 * Can work in mock mode for testing without a backend.
 */
export function useVideoUpload(options: UseVideoUploadOptions = {}) {
	const {
		mockMode = false,
		mockDuration = 3000,
		mockErrorProbability = 0,
		onUploadComplete,
		onUploadError,
		onUploadStart,
		onProgress,
	} = options;

	const [status, setStatus] = useState<VideoUploadStatus>("idle");
	const [progress, setProgressState] = useState<VideoUploadProgress>(initialProgress);
	const [error, setError] = useState<string | null>(null);
	const [file, setFileState] = useState<File | null>(null);
	const [video, setVideo] = useState<VideoUploadResult | null>(null);

	const abortControllerRef = useRef<AbortController | null>(null);

	const setProgress = useCallback(
		(p: VideoUploadProgress) => {
			setProgressState(p);
			onProgress?.(p);
		},
		[onProgress],
	);

	const reset = useCallback(() => {
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;
		setStatus("idle");
		setProgress(initialProgress);
		setError(null);
		setFileState(null);
		setVideo(null);
	}, [setProgress]);

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
		abortControllerRef.current?.abort();
		abortControllerRef.current = null;
		setStatus("canceled");
	}, []);

	const startMockUpload = useCallback(
		async (uploadFile: File, signal: AbortSignal): Promise<VideoUploadResult> => {
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
			return {
                id: `mock-video-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                filename: uploadFile.name,
                mime_type: uploadFile.type,
                created_at: new Date().toISOString(),
            };
		},
		[mockDuration, mockErrorProbability, setProgress],
	);

	const startRealUpload = useCallback(
		async (uploadFile: File, signal: AbortSignal): Promise<VideoUploadResult> => {
			// Dynamic import to avoid loading the API when not needed

			const result = await VideosApi.uploadVideoResumable(uploadFile, {
				signal,
				onTotalProgress: ({ sentBytes, totalBytes }) => {
					const pct = totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0;
					setProgress({ sent: sentBytes, total: totalBytes, pct });
				},
			});

			return result;
		},
		[setProgress],
	);

	const startUpload = useCallback(
		async (uploadFile: File): Promise<VideoUploadResult | null> => {
			// Cancel any existing upload
			abortControllerRef.current?.abort();

			const controller = new AbortController();
			abortControllerRef.current = controller;

			setFileState(uploadFile);
			setStatus("uploading");
			setError(null);
			setVideo(null);
			setProgress({ sent: 0, total: uploadFile.size, pct: 0 });

			onUploadStart?.(uploadFile);

			try {
				const video = mockMode
					? await startMockUpload(uploadFile, controller.signal)
					: await startRealUpload(uploadFile, controller.signal);

				setVideo(video);
				setStatus("completed");
				onUploadComplete?.(video, uploadFile);
				return video;
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
		[mockMode, startMockUpload, startRealUpload, setProgress, onUploadStart, onUploadComplete, onUploadError],
	);

	const state: VideoUploadState = useMemo(
		() => ({
			status,
			progress,
			error,
			file,
			video,
		}),
		[status, progress, error, file, video],
	);

	return useMemo(
		() => ({
			...state,
			startUpload,
			cancelUpload,
			reset,
			setFile,
            mockMode,
		}),
		[state, startUpload, cancelUpload, reset, setFile, mockMode],
	);
}

export type UseVideoUploadReturn = ReturnType<typeof useVideoUpload>;
