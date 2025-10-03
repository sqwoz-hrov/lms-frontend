// api/videosApi.ts
import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import apiClient from "./client";

/** Gzip a Blob using the Web Streams API into a single gzip stream. */
async function gzipWholeBlob(input: Blob): Promise<Blob> {
	const CS = globalThis.CompressionStream;
	if (!CS) {
		throw new Error("CompressionStream API is not available in this browser. Cannot gzip file.");
	}
	const gzip = new CS("gzip");
	const compressedStream = input.stream().pipeThrough(gzip);
	const chunks: Uint8Array[] = [];
	const reader = compressedStream.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	return new Blob(chunks, { type: "application/octet-stream" });
}

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
	chunkSize?: number; // still interpreted in ORIGINAL bytes for UI pacing, but encoded slicing uses encoded offsets (see below)
	onChunkProgress?: (e: AxiosProgressEvent) => void;
	onTotalProgress?: (p: { sentBytes: number; totalBytes: number; pct: number }) => void; // still reports ORIGINAL-based progress (approx)
	onPartial?: (p: { sessionId: string; uploadOffset: number }) => void;
	signal?: AbortSignal;
	resume?: { sessionId: string; uploadOffset: number }; // server-provided (encoded) offset
};

function getHeader(res: { headers: any }, name: string): string | undefined {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const h = res.headers;
	console.debug(h, h.toJSON?.(), h.get?.(name), name);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	if (h && typeof h.get === "function") return h.get(name) ?? undefined;
}

/**
 * Upload a chunk defined in ENCODED (gzipped) space.
 * - contentRangeStart/contentRangeEnd/contentRangeTotal: encoded coordinates
 * - originalSpan: optional, to pass the original (pre-gzip) start-end/total for diagnostics (server can ignore)
 */
async function uploadEncodedChunk(args: {
	gzFile: Blob; // whole-file gzip Blob
	contentRangeStart: number; // encoded
	contentRangeEnd: number; // encoded (inclusive)
	contentRangeTotal: number; // encoded total
	sessionId?: string;
	onChunkProgress?: (e: AxiosProgressEvent) => void;
	signal?: AbortSignal;
	originalSpan?: { start: number; endInclusive: number; total: number }; // optional
}): Promise<UploadChunkResult> {
	const {
		gzFile,
		contentRangeStart,
		contentRangeEnd,
		contentRangeTotal,
		sessionId,
		onChunkProgress,
		signal,
		originalSpan,
	} = args;

	const encodedSlice = gzFile.slice(contentRangeStart, contentRangeEnd + 1);
	const encodedLength = encodedSlice.size;

	const form = new FormData();
	form.append("file", encodedSlice, "chunk.gz");

	const headers: Record<string, string> = {
		"Content-Type": "multipart/form-data",
		// Content-Range in ENCODED space (what the server now expects)
		"Content-Range": `bytes ${contentRangeStart}-${contentRangeEnd}/${contentRangeTotal}`,
		// Upload-Chunk-Size should match the encoded declared length on the server's side
		"Upload-Chunk-Size": String(encodedLength),
		"Content-Encoding": "gzip",
	};

	// Optional: send original span for logging/metrics if you care (server may ignore)
	if (originalSpan) {
		headers["Upload-Original-Range"] = `bytes ${originalSpan.start}-${originalSpan.endInclusive}/${originalSpan.total}`;
	}

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
	// 1) Prepare whole-file gzip once to obtain encoded total and enable encoded slicing
	const gzFile = await gzipWholeBlob(file);
	const encodedTotal = gzFile.size;
	const originalTotal = file.size;

	// Keep the same public option name; we’ll *pace* roughly by original size, but encoded slicing uses encoded offsets.
	const originalChunkSize = opts.chunkSize ?? 5 * 1024 * 1024;

	// 2) Resume support now uses ENCODED offset returned by the server
	let sessionId = opts.resume?.sessionId;
	let nextEncodedOffset = opts.resume?.uploadOffset ?? 0;

	// 3) Progress: report ORIGINAL-based progress (approximate via encoded proportion)
	const reportTotalApproxOriginal = (encodedSent: number) => {
		const approxOriginalSent =
			encodedTotal > 0 ? Math.min(originalTotal, Math.round((encodedSent / encodedTotal) * originalTotal)) : 0;
		const pct = originalTotal > 0 ? Math.min(100, Math.round((approxOriginalSent / originalTotal) * 100)) : 0;
		opts.onTotalProgress?.({ sentBytes: approxOriginalSent, totalBytes: originalTotal, pct });
	};

	reportTotalApproxOriginal(nextEncodedOffset);

	// 4) Loop in ENCODED space. For pacing, compute a target encoded chunk length
	//    proportional to your originalChunkSize.
	const encodedChunkSize =
		originalTotal > 0
			? Math.max(256 * 1024, Math.floor((originalChunkSize / originalTotal) * encodedTotal)) // keep some minimum size
			: originalChunkSize;

	while (nextEncodedOffset < encodedTotal) {
		const encStart = nextEncodedOffset;
		const encEnd = Math.min(encStart + encodedChunkSize, encodedTotal) - 1;

		// Optional: we can provide a *rough* original span for diagnostics only.
		// (Exact mapping would require additional indexing; not needed for protocol correctness.)
		const approxOriginalStart = encodedTotal > 0 ? Math.floor((encStart / encodedTotal) * originalTotal) : 0;
		const approxOriginalEnd =
			encodedTotal > 0 ? Math.min(originalTotal - 1, Math.floor((encEnd / encodedTotal) * originalTotal)) : 0;

		const res = await uploadEncodedChunk({
			gzFile,
			contentRangeStart: encStart,
			contentRangeEnd: encEnd,
			contentRangeTotal: encodedTotal,
			sessionId,
			signal: opts.signal,
			onChunkProgress: e => {
				// Axios reports encoded bytes per request; convert to approximate original progress for UI
				const loadedEncoded = (e.loaded ?? 0) + encStart;
				if (loadedEncoded > nextEncodedOffset) nextEncodedOffset = loadedEncoded;
				reportTotalApproxOriginal(nextEncodedOffset);
				opts.onChunkProgress?.(e);
			},
			originalSpan: {
				start: approxOriginalStart,
				endInclusive: approxOriginalEnd,
				total: originalTotal,
			},
		});

		if (res.kind === "partial") {
			opts.onPartial?.({ sessionId: res.sessionId, uploadOffset: res.uploadOffset });
			sessionId = res.sessionId;
			nextEncodedOffset = res.uploadOffset; // server returns encoded offset
			continue;
		}

		// completed
		reportTotalApproxOriginal(encodedTotal);
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
