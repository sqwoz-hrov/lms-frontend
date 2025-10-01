import { useCallback, useMemo, useRef, useState } from "react";
import { VideosApi, type VideoResponseDto } from "../api/videosApi";

type Status = "idle" | "uploading" | "paused" | "completed" | "error" | "canceled";

type Options = {
	chunkSize?: number;
	onProgress?: (p: { sent: number; total: number; pct: number }) => void;
};

type ResumeStateLoose = { sessionId?: string; uploadOffset: number };
function hasSession(v: ResumeStateLoose): v is { sessionId: string; uploadOffset: number } {
	return typeof v.sessionId === "string" && v.sessionId.length > 0;
}

export function useResumableVideoUpload(options: Options = {}) {
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

	const start = useCallback(
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
