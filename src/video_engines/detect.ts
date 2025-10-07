import { EngineKind } from "./types";

const HLS_MIME = new Set(["application/x-mpegurl", "application/vnd.apple.mpegurl"]);
const DASH_MIME = new Set(["application/dash+xml"]);
const TS_MIME = new Set(["video/mp2t"]);
const NATIVE_MIME = new Set(["video/mp4", "video/webm", "video/ogg", "video/ogv", "audio/mp4", "audio/webm"]);

const hasExt = (src: string, ext: string) => src.toLowerCase().includes(ext);

export function detectKind(src?: string, mime?: string | null): EngineKind | null {
	if (!src) return null;
	const m = (mime || "").split(";")[0].trim().toLowerCase();

	if (m && HLS_MIME.has(m)) return "hlsjs";
	if (m && DASH_MIME.has(m)) return "dash";
	if (m && TS_MIME.has(m)) return "mpegts";
	if (m && NATIVE_MIME.has(m)) return "native";

	if (hasExt(src, ".m3u8")) return "hlsjs";
	if (hasExt(src, ".mpd")) return "dash";
	if (hasExt(src, ".ts")) return "mpegts";
	if (hasExt(src, ".mp4") || hasExt(src, ".webm") || hasExt(src, ".ogv")) return "native";

	// всё остальное — попробуем как native (может .mov с h264), иначе на UI покажем подсказку о конвертации
	return "native";
}
