export type EngineOpts = {
	credentials: RequestCredentials;
	withCredentials: boolean;
	crossOrigin?: HTMLVideoElement["crossOrigin"];
};

export interface Engine {
	load(video: HTMLVideoElement, src: string, opts: EngineOpts): Promise<void> | void;
	destroy(): void;
}

export type EngineKind = "native" | "hlsjs" | "dash" | "mpegts" | "flv";
