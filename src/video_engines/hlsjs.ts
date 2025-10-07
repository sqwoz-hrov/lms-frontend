import type { Engine, EngineOpts } from "./types";
import Hls from "hls.js";

export class HlsJsEngine implements Engine {
	private hls: Hls | null = null;

	load(video: HTMLVideoElement, src: string, opts: EngineOpts) {
		if (video.canPlayType("application/vnd.apple.mpegurl")) {
			video.src = src;
			video.load();
			return;
		}
		if (!Hls.isSupported()) throw new Error("HLS not supported");

		this.hls = new Hls({
			enableWorker: true,
			xhrSetup: xhr => {
				xhr.withCredentials = opts.withCredentials;
			},
			fetchSetup: (ctx, init = {}) => new Request(ctx.url, { ...init, credentials: opts.credentials }),
		});
		this.hls.attachMedia(video);
		this.hls.loadSource(src);
	}

	destroy() {
		this.hls?.destroy();
		this.hls = null;
	}
}
