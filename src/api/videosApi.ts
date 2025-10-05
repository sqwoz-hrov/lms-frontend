// api/videosApi.ts
import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import apiClient from "./client";

export type UploadedRangeDto = { start: string; end: string };

export type VideoResponseDto = {
	id: string;
	filename: string;
	mime_type?: string | null;
	youtube_link?: string | null;
	total_size?: string;
	chunk_size?: string;
	phase?: "uploading" | "processing" | "completed" | "failed";
	uploaded_ranges?: UploadedRangeDto[];
	upload_offset?: string;
	checksum?: string | null;
	created_at: string;
};

export type GetByIdVideoResponseDto = {
	id: string;
	filename: string;
	mime_type?: string | null;
	youtube_link?: string | null;
	total_size?: string;
	chunk_size?: string;
	phase?: "uploading" | "processing" | "completed" | "failed";
	uploaded_ranges?: UploadedRangeDto[];
	upload_offset?: string;
	checksum?: string | null;
	created_at: string;
	video_url?: string;
};

export type UploadChunkResult =
	| { kind: "partial"; uploadOffset: number; sessionId: string }
	| {
			kind: "completed";
			uploadOffset: number;
			uploadLength: number;
			location?: string;
			video: VideoResponseDto;
	  };

type UploadVideoOptions = {
	/** Размер чанка в оригинальных байтах. */
	chunkSize?: number;
	onChunkProgress?: (e: AxiosProgressEvent) => void;
	onTotalProgress?: (p: { sentBytes: number; totalBytes: number; pct: number }) => void;
	onPartial?: (p: { sessionId: string; uploadOffset: number }) => void;
	signal?: AbortSignal;
	/** Резюмирование в оригинальных координатах */
	resume?: { sessionId: string; uploadOffset: number };
};

function getHeader(res: { headers: any }, name: string): string | undefined {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const h = res.headers;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	if (h && typeof h.get === "function") return h.get(name) ?? undefined;
	if (h && typeof h[name.toLowerCase()] !== "undefined") return String(h[name.toLowerCase()]);
	return undefined;
}

/** Загрузка одного чанка в ОРИГИНАЛЬНЫХ координатах. */
async function uploadChunk(args: {
	file: Blob;
	contentRangeStart: number; // original
	contentRangeEnd: number; // original (inclusive)
	contentRangeTotal: number; // original total
	sessionId?: string;
	onChunkProgress?: (e: AxiosProgressEvent) => void;
	signal?: AbortSignal;
}): Promise<UploadChunkResult> {
	const { file, contentRangeStart, contentRangeEnd, contentRangeTotal, sessionId, onChunkProgress, signal } = args;

	const slice = file.slice(contentRangeStart, contentRangeEnd + 1);
	const sliceLength = slice.size;

	const form = new FormData();
	form.append("file", slice, "chunk.bin");

	const headers: Record<string, string> = {
		"Content-Type": "multipart/form-data",
		"Content-Range": `bytes ${contentRangeStart}-${contentRangeEnd}/${contentRangeTotal}`,
		"Upload-Chunk-Size": String(sliceLength),
	};
	if (sessionId) headers["Upload-Session-Id"] = sessionId;

	const cfg: AxiosRequestConfig = {
		headers,
		onUploadProgress: onChunkProgress,
		signal,
		validateStatus: s => (s >= 200 && s < 300) || s === 204,
	};

	const res = await apiClient.post<VideoResponseDto>("/videos", form, cfg);

	const offsetHeader = getHeader(res, "Upload-Offset");
	const sessionHeader = getHeader(res, "Upload-Session-Id");
	const lengthHeader = getHeader(res, "Upload-Length");
	const location = getHeader(res, "Location");

	const uploadOffset = offsetHeader != null ? Number(String(offsetHeader)) : NaN;

	if (res.status === 204) {
		const sid = String(sessionHeader ?? "");
		if (!sid) throw new Error("Server did not provide upload-session-id on partial response.");
		if (!Number.isFinite(uploadOffset)) throw new Error("Invalid upload-offset header.");
		return { kind: "partial", uploadOffset, sessionId: sid };
	}

	const uploadLength = lengthHeader != null ? Number(String(lengthHeader)) : NaN;
	if (!Number.isFinite(uploadOffset) || !Number.isFinite(uploadLength)) {
		throw new Error("Missing/invalid upload-offset or upload-length on completion.");
	}
	return {
		kind: "completed",
		uploadOffset,
		uploadLength,
		location: typeof location === "string" ? location : undefined,
		video: res.data,
	};
}

export async function uploadVideoResumable(file: File, opts: UploadVideoOptions = {}): Promise<VideoResponseDto> {
	const total = file.size;
	const chunkSize = opts.chunkSize ?? 5 * 1024 * 1024;

	let sessionId = opts.resume?.sessionId;
	let nextOffset = opts.resume?.uploadOffset ?? 0;

	const reportProgress = (sent: number) => {
		const clamped = Math.min(total, Math.max(0, sent));
		const pct = total > 0 ? Math.min(100, Math.round((clamped / total) * 100)) : 0;
		opts.onTotalProgress?.({ sentBytes: clamped, totalBytes: total, pct });
	};

	reportProgress(nextOffset);

	while (nextOffset < total) {
		const start = nextOffset;
		const end = Math.min(start + chunkSize, total) - 1;

		const res = await uploadChunk({
			file,
			contentRangeStart: start,
			contentRangeEnd: end,
			contentRangeTotal: total,
			sessionId,
			signal: opts.signal,
			onChunkProgress: e => {
				// Axios считает внутри-чанковый прогресс; прибавляем базовый offset
				const loaded = (e.loaded ?? 0) + start;
				if (loaded > nextOffset) nextOffset = loaded;
				reportProgress(nextOffset);
				opts.onChunkProgress?.(e);
			},
		});

		if (res.kind === "partial") {
			opts.onPartial?.({ sessionId: res.sessionId, uploadOffset: res.uploadOffset });
			sessionId = res.sessionId;
			nextOffset = res.uploadOffset;
			continue;
		}

		// completed
		reportProgress(total);
		return res.video;
	}

	throw new Error("Upload loop ended unexpectedly without completion.");
}

export async function getVideoById(id: string): Promise<GetByIdVideoResponseDto> {
	const res = await apiClient.get<GetByIdVideoResponseDto>(`/videos/${id}`);
	return res.data;
}

export const VideosApi = {
	uploadVideoResumable,
	getById: getVideoById,
};
