import { HlsJsEngine } from "./hlsjs";
import { NativeEngine } from "./native";
import { DashEngine } from "./dash";
import { MpegTsEngine } from "./mpegts";
import type { Engine, EngineKind } from "./types";

export function createEngine(kind: EngineKind): Engine {
	switch (kind) {
		case "hlsjs":
			return new HlsJsEngine();
		case "dash":
			return new DashEngine();
		case "mpegts":
			return new MpegTsEngine();
		case "native":
		default:
			return new NativeEngine();
	}
}
