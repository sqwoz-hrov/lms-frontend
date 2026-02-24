import { useCallback, useMemo, useRef, useState } from "react";
import { VideosApi, type VideoResponseDto } from "../api/videosApi";

type Status = "idle" | "uploading" | "paused" | "completed" | "error" | "canceled";

type Options = {
	chunkSize?: number;
	onProgress?: (p: { sent: number; total: number; pct: number }) => void;
	/** Enable mock mode — no real API calls are made */
	mock?: boolean;
	/** Total simulated upload duration in ms (default: 4000) */
	mockDuration?: number;
	/** Simulate a random error with this probability 0–1 (default: 0) */
	mockErrorProbability?: number;
};

export function useResumableVideoUpload(options: Options = {}) {
	const {
		mock = false,
		mockDuration = 4000,
		mockErrorProbability = 0,
	} = options;
	const [status, setStatus] = useState<Status>("idle");
	const [error, setError] = useState<string | null>(null);
	const [video, setVideo] = useState<VideoResponseDto | null>(null);
	const [progress, setProgress] = useState<{ sent: number; total: number; pct: number }>({
		sent: 0,
		total: 0,
		pct: 0,
	});

	const abortRef = useRef<AbortController | null>(null);
	const resumeStateRef = useRef<{ sessionId?: string; uploadOffset: number }>({
		sessionId: undefined,
		uploadOffset: 0,
	});

	const updateProgress = useCallback(
		(sent: number, total: number) => {
			const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;
			const payload = { sent, total, pct };
			setProgress(payload);
			options.onProgress?.(payload);
		},
		[options],
	);

	const startMock = useCallback(
		async (file: File): Promise<VideoResponseDto> => {
			setStatus("uploading");
			setError(null);
			setVideo(null);
			updateProgress(0, file.size);

			abortRef.current?.abort();
			const ctrl = new AbortController();
			abortRef.current = ctrl;

			const steps = 20;
			const stepMs = mockDuration / steps;

			try {
				for (let i = 1; i <= steps; i++) {
					await new Promise<void>((resolve, reject) => {
						const t = setTimeout(resolve, stepMs);
						ctrl.signal.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); }, { once: true });
					});
					updateProgress(Math.round((file.size * i) / steps), file.size);
				}

				if (Math.random() < mockErrorProbability) {
					throw new Error("Mock upload error: simulated failure");
				}

				const result: VideoResponseDto = {
					id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					filename: file.name,
					mime_type: file.type || "video/mp4",
					created_at: new Date().toISOString(),
				};

				setVideo(result);
				setStatus("completed");
				resumeStateRef.current = { sessionId: undefined, uploadOffset: 0 };
				return result;
			} catch (err: any) {
				if (ctrl.signal.aborted) {
					setStatus("canceled");
					throw new Error("Upload canceled");
				}
				setStatus("error");
				setError(err?.message ?? "Mock upload failed");
				throw err;
			}
		},
		[mockDuration, mockErrorProbability, updateProgress],
	);

	const startReal = useCallback(
		async (file: File): Promise<VideoResponseDto> => {
			setStatus("uploading");
			setError(null);
			setVideo(null);
			updateProgress(0, file.size);

			abortRef.current?.abort();
			const ctrl = new AbortController();
			abortRef.current = ctrl;

			try {
				const result = await VideosApi.uploadVideoResumable(file, {
					chunkSize: options.chunkSize,
					signal: ctrl.signal,
					// if we already have a resume point (after a pause or reload)
					resume: resumeStateRef.current.sessionId
						? { sessionId: resumeStateRef.current.sessionId, uploadOffset: resumeStateRef.current.uploadOffset }
						: undefined,
					onTotalProgress: ({ sentBytes, totalBytes }) => {
						updateProgress(sentBytes, totalBytes);
						if (sentBytes > resumeStateRef.current.uploadOffset) {
							resumeStateRef.current.uploadOffset = sentBytes;
						}
					},
					onPartial: ({ sessionId, uploadOffset }) => {
						// capture server-issued session id and authoritative offset on 204s
						resumeStateRef.current.sessionId = sessionId;
						if (uploadOffset > resumeStateRef.current.uploadOffset) {
							resumeStateRef.current.uploadOffset = uploadOffset;
						}
					},
				});

				setVideo(result);
				setStatus("completed");
				// clear resume state on success
				resumeStateRef.current = { sessionId: undefined, uploadOffset: 0 };
				return result; // ← IMPORTANT: return the video
			} catch (err: any) {
				if (ctrl.signal.aborted) {
					setStatus("canceled");
					throw new Error("Upload canceled");
				}
				setStatus("error");
				setError(err?.message ?? "Upload failed");
				throw err;
			}
		},
		[options.chunkSize, updateProgress],
	);

	const start = mock ? startMock : startReal;

	const pause = useCallback(() => {
		if (status !== "uploading") return;
		setStatus("paused");
		abortRef.current?.abort();
	}, [status]);

	const resume = useCallback(
		(file: File) => {
			// delegate to start(); we already pass resume info if present
			return start(file);
		},
		[start],
	);

	const cancel = useCallback(() => {
		abortRef.current?.abort();
		setStatus("canceled");
	}, []);

	const setResumePoint = useCallback((sessionId: string, uploadOffset: number) => {
		resumeStateRef.current = { sessionId, uploadOffset };
	}, []);

	return useMemo(
		() => ({
			status,
			error,
			video,
			progress,
			start,
			pause,
			resume,
			cancel,
			setResumePoint,
		}),
		[status, error, video, progress, start, pause, resume, cancel, setResumePoint],
	);
}
