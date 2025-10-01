/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
	video_url?: string | null; // presigned URL на S3-объект
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
	chunkSize?: number;
	onChunkProgress?: (e: AxiosProgressEvent) => void;
	onTotalProgress?: (p: { sentBytes: number; totalBytes: number; pct: number }) => void;
	onPartial?: (p: { sessionId: string; uploadOffset: number }) => void; // ← NEW
	signal?: AbortSignal;
	resume?: { sessionId: string; uploadOffset: number };
};
function getHeader(res: { headers: any }, name: string): string | undefined {
	const h = res.headers;
	console.debug(h, h.toJSON(), h.get(name), name);
	if (h && typeof h.get === "function") return h.get(name) ?? undefined; // Axios v1+
}

async function uploadVideoChunk(args: {
	file: Blob;
	start: number;
	endInclusive: number;
	totalSize: number;
	sessionId?: string;
	onChunkProgress?: (e: AxiosProgressEvent) => void;
	signal?: AbortSignal;
}): Promise<UploadChunkResult> {
	const { file, start, endInclusive, totalSize, sessionId, onChunkProgress, signal } = args;

	const form = new FormData();
	form.append("file", file.slice(start, endInclusive + 1), "chunk");

	const headers: Record<string, string> = {
		"Content-Type": "multipart/form-data",
		"Content-Range": `bytes ${start}-${endInclusive}/${totalSize}`,
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
	const chunkSize = opts.chunkSize ?? 5 * 1024 * 1024;
	const totalSize = file.size;

	let sessionId = opts.resume?.sessionId;
	let nextOffset = opts.resume?.uploadOffset ?? 0;

	const reportTotal = (sentBytes: number) => {
		const pct = totalSize > 0 ? Math.min(100, Math.round((sentBytes / totalSize) * 100)) : 0;
		opts.onTotalProgress?.({ sentBytes, totalBytes: totalSize, pct });
	};

	// prime initial progress
	reportTotal(nextOffset);

	while (nextOffset < totalSize) {
		const start = nextOffset;
		const endInclusive = Math.min(start + chunkSize, totalSize) - 1;
		const sentBefore = start;

		const res = await uploadVideoChunk({
			file,
			start,
			endInclusive,
			totalSize,
			sessionId,
			signal: opts.signal,
			onChunkProgress: e => {
				// Axios reports per-request progress; convert to total
				const loaded = (e.loaded ?? 0) + sentBefore;
				reportTotal(loaded);
				// keep a resume point best-effort (advance monotonically)
				if (loaded > nextOffset) nextOffset = loaded;
				opts.onChunkProgress?.(e);
			},
		});

		if (res.kind === "partial") {
			// notify caller so the hook can store resume info
			opts.onPartial?.({ sessionId: res.sessionId, uploadOffset: res.uploadOffset });
			sessionId = res.sessionId;
			nextOffset = res.uploadOffset;
			continue;
		}

		// completed
		reportTotal(totalSize);
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
