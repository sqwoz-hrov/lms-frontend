import type { Engine, EngineOpts } from "./types";

export class DashEngine implements Engine {
	private player: any;

	async load(video: HTMLVideoElement, src: string, _opts: EngineOpts) {
		const dashjs = await import("dashjs");
		this.player = dashjs.MediaPlayer().create();
		this.player.initialize(video, src, false);
	}
	destroy() {
		this.player?.reset?.();
		this.player = null;
	}
}
