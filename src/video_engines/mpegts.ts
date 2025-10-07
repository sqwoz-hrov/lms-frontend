import type { Engine, EngineOpts } from "./types";

export class MpegTsEngine implements Engine {
	private p: any;

	async load(video: HTMLVideoElement, src: string, _opts: EngineOpts) {
		const mpegts = await import("mpegts.js"); // aka flv.js (mpegts build)
		if (!mpegts.default.isSupported()) throw new Error("MPEGTS not supported");
		this.p = mpegts.default.createPlayer({ type: "mpegts", isLive: false, url: src });
		this.p.attachMediaElement(video);
		this.p.load();
	}
	destroy() {
		try {
			this.p?.destroy?.();
		} finally {
			this.p = null;
		}
	}
}
