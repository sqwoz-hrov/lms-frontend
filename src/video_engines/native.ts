import type { Engine, EngineOpts } from "./types";

export class NativeEngine implements Engine {
	load(video: HTMLVideoElement, src: string, _opts: EngineOpts) {
		video.src = src;
		video.load();
	}
	destroy() {}
}
