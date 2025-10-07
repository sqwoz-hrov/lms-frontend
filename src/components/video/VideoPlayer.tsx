import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Hls from "hls.js";
import { Loader2, Hash, CloudUpload, Clock, XCircle } from "lucide-react";

type Props = {
	src?: string;
	type?: string | null;
	title?: string;
	poster?: string;
	phase?: "receiving" | "hashing" | "uploading_s3" | "completed" | "failed";
};

type PlayerPhase = NonNullable<Props["phase"]>;

type PhasePresentation = {
	title: string;
	desc?: string;
	icon: ReactNode;
};

const HLS_MIME_TYPES = new Set(["application/x-mpegURL", "application/vnd.apple.mpegurl"]);
const DEFAULT_PHASE: PlayerPhase = "receiving";

const PHASE_PRESENTATION: Record<PlayerPhase, PhasePresentation> = {
	receiving: {
		title: "Видео принимается",
		desc: "Мы получили запрос и начинаем обработку.",
		icon: <Clock className="h-5 w-5" />,
	},
	hashing: {
		title: "Подсчёт хеша",
		desc: "Проверяем целостность загруженных чанков.",
		icon: <Hash className="h-5 w-5" />,
	},
	uploading_s3: {
		title: "Загрузка в хранилище",
		desc: "Загружаем видео в хранилище. Это может занять несколько минут.",
		icon: <CloudUpload className="h-5 w-5" />,
	},
	completed: {
		title: "Готово",
		icon: null,
	},
	failed: {
		title: "Не удалось обработать видео",
		desc: "Попробуйте обновить страницу чуть позже или перезагрузить видео.",
		icon: <XCircle className="h-5 w-5" />,
	},
};

function mediaErrorToMessage(err?: MediaError | null): string {
	if (!err) return "Не удалось воспроизвести видео.";

	switch (err.code) {
		case MediaError.MEDIA_ERR_ABORTED:
			return "Воспроизведение было прервано.";
		case MediaError.MEDIA_ERR_NETWORK:
			return "Произошла сетевая ошибка при загрузке видео.";
		case MediaError.MEDIA_ERR_DECODE:
			return "Видео повреждено или использует неподдерживаемый кодек.";
		case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
			return "Видео не поддерживается этим браузером.";
		default:
			return "Не удалось воспроизвести видео.";
	}
}

const EMPTY_ICON = <Loader2 className="h-5 w-5 animate-spin" />;

export function VideoPlayer({ src, type, title, poster, phase }: Props) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const hlsRef = useRef<Hls | null>(null);

	const [fatalError, setFatalError] = useState<string | null>(null);
	const [isBuffering, setIsBuffering] = useState(false);

	const playerPhase: PlayerPhase = phase ?? DEFAULT_PHASE;

	const normalizedType = useMemo(() => {
		if (!type) return "";
		const [mime] = type.split(";");
		return (mime ?? "").trim().toLowerCase();
	}, [type]);

	const isHlsSource = useMemo(() => {
		if (!src) return false;
		if (normalizedType && HLS_MIME_TYPES.has(normalizedType)) return true;
		return src.toLowerCase().endsWith(".m3u8");
	}, [normalizedType, src]);

	const canUseHlsJs = useMemo(() => {
		if (typeof window === "undefined") return false;
		return isHlsSource && Hls.isSupported();
	}, [isHlsSource]);

	const isCompletedPhase = playerPhase === "completed";
	const hasSource = Boolean(src);
	const isReadyForPlayback = isCompletedPhase && hasSource && !fatalError;

	const corsMode = useMemo(() => {
		if (typeof window === "undefined") {
			return {
				crossOrigin: undefined,
				credentials: "omit" as RequestCredentials,
				withCredentials: false,
			};
		}

		if (!src) {
			return { crossOrigin: undefined, credentials: "omit" as RequestCredentials, withCredentials: false };
		}

		try {
			const url = new URL(src, window.location.href);
			const sameOrigin = url.origin === window.location.origin;
			if (sameOrigin) {
				return { crossOrigin: undefined, credentials: "same-origin" as RequestCredentials, withCredentials: true };
			}

			return { crossOrigin: "anonymous" as const, credentials: "omit" as RequestCredentials, withCredentials: false };
		} catch {
			return { crossOrigin: "anonymous" as const, credentials: "omit" as RequestCredentials, withCredentials: false };
		}
	}, [src]);

	const handleVideoRef = useCallback((node: HTMLVideoElement | null) => {
		videoRef.current = node;
	}, []);

	useEffect(() => {
		setFatalError(null);
	}, [src, playerPhase]);

	useEffect(() => {
		if (!isReadyForPlayback) setIsBuffering(false);
	}, [isReadyForPlayback]);
	useEffect(() => {
		const v = videoRef.current;
		if (!v) return;
		const log = (e: Event) =>
			console.log("[video]", e.type, { readyState: v.readyState, networkState: v.networkState, error: v.error });
		const names = [
			"loadstart",
			"loadedmetadata",
			"loadeddata",
			"canplay",
			"canplaythrough",
			"waiting",
			"stalled",
			"suspend",
			"error",
			"progress",
			"seeking",
			"seeked",
			"ended",
			"play",
			"pause",
		];
		names.forEach(n => v.addEventListener(n, log));
		return () => names.forEach(n => v.removeEventListener(n, log));
	}, []);
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (!isReadyForPlayback) {
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
			video.pause();
			video.removeAttribute("src");
			video.load();
			return;
		}

		if (canUseHlsJs && src) {
			const hls = new Hls({
				enableWorker: true,
				debug: true, // ВРЕМЕННО: включить логи
				maxLiveSyncPlaybackRate: 1.0,
				// ограничим ретраи сети
				xhrSetup: xhr => {
					xhr.withCredentials = corsMode.withCredentials;
				},
				fetchSetup: (context, init = {}) => new Request(context.url, { ...init, credentials: corsMode.credentials }),
			});
			hlsRef.current = hls;

			const handleHlsError = (_event: string, data: any) => {
				if (!data || !data.fatal) return;

				switch (data.type) {
					case Hls.ErrorTypes.NETWORK_ERROR: {
						hls.startLoad();
						break;
					}
					case Hls.ErrorTypes.MEDIA_ERROR: {
						hls.recoverMediaError();
						break;
					}
					default: {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const responseCode = data?.response?.code;
						const message =
							typeof responseCode === "number"
								? `Не удалось воспроизвести потоковое видео (HTTP ${responseCode}).`
								: "Не удалось воспроизвести потоковое видео.";
						setFatalError(message);
						hls.destroy();
						hlsRef.current = null;
					}
				}
			};

			const handleManifestParsed = () => setIsBuffering(false);
			const handleLoadStart = () => setIsBuffering(true);

			hls.on(Hls.Events.ERROR, handleHlsError);
			hls.on(Hls.Events.MANIFEST_PARSED, handleManifestParsed);
			hls.on(Hls.Events.FRAG_LOADING, handleLoadStart);

			setIsBuffering(true);
			hls.attachMedia(video);
			hls.loadSource(src);

			return () => {
				hls.off(Hls.Events.ERROR, handleHlsError);
				hls.off(Hls.Events.MANIFEST_PARSED, handleManifestParsed);
				hls.off(Hls.Events.FRAG_LOADING, handleLoadStart);
				hls.destroy();
				hlsRef.current = null;
			};
		}

		if (src) {
			video.src = src;
			video.load();
			setIsBuffering(true);
		}

		return () => {
			video.pause();
			video.removeAttribute("src");
			video.load();
		};
	}, [canUseHlsJs, corsMode, isReadyForPlayback, src]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleWaiting = () => setIsBuffering(true);
		const handlePlaying = () => setIsBuffering(false);
		const handleCanPlay = () => setIsBuffering(false);
		const handleError = () => {
			if (!isReadyForPlayback) return;
			setFatalError(mediaErrorToMessage(video.error));
		};

		video.addEventListener("waiting", handleWaiting);
		video.addEventListener("playing", handlePlaying);
		video.addEventListener("canplay", handleCanPlay);
		video.addEventListener("canplaythrough", handleCanPlay);
		video.addEventListener("loadeddata", handleCanPlay);
		video.addEventListener("loadstart", handleWaiting);
		video.addEventListener("stalled", handleWaiting);
		video.addEventListener("suspend", handleCanPlay);
		video.addEventListener("error", handleError);

		return () => {
			video.removeEventListener("waiting", handleWaiting);
			video.removeEventListener("playing", handlePlaying);
			video.removeEventListener("canplay", handleCanPlay);
			video.removeEventListener("canplaythrough", handleCanPlay);
			video.removeEventListener("loadeddata", handleCanPlay);
			video.removeEventListener("loadstart", handleWaiting);
			video.removeEventListener("stalled", handleWaiting);
			video.removeEventListener("suspend", handleCanPlay);
			video.removeEventListener("error", handleError);
		};
	}, [isReadyForPlayback]);

	const overlay = useMemo(() => {
		if (fatalError) {
			return {
				icon: <XCircle className="h-6 w-6 text-red-300" />,
				title: "Не удалось воспроизвести видео",
				desc: fatalError,
				tone: "error" as const,
			};
		}

		if (playerPhase === "failed") {
			return {
				...PHASE_PRESENTATION.failed,
				icon: PHASE_PRESENTATION.failed.icon ?? <XCircle className="h-5 w-5" />,
				tone: "error" as const,
			};
		}

		if (!isCompletedPhase) {
			const presentation = PHASE_PRESENTATION[playerPhase];
			return {
				...presentation,
				icon: presentation.icon ?? EMPTY_ICON,
				tone: "primary" as const,
			};
		}

		if (!hasSource) {
			return {
				icon: EMPTY_ICON,
				title: "Ссылка на видео пока недоступна",
				desc: "Попробуйте обновить страницу чуть позже.",
				tone: "primary" as const,
			};
		}

		if (isReadyForPlayback && isBuffering) {
			return {
				icon: EMPTY_ICON,
				title: "Подготовка видео…",
				tone: "primary" as const,
			};
		}

		return null;
	}, [fatalError, hasSource, isBuffering, isCompletedPhase, isReadyForPlayback, playerPhase]);

	const overlayClasses =
		overlay?.tone === "error"
			? "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center text-sm text-red-100"
			: "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-6 text-center text-sm text-white";

	return (
		<div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
			<video
				ref={handleVideoRef}
				className="size-full object-contain"
				crossOrigin={corsMode.crossOrigin ?? "anonymous"}
				controls={isReadyForPlayback}
				playsInline
				preload="metadata"
				poster={poster}
				title={title}
				aria-label={title}
			/>

			{overlay ? (
				<div className={overlayClasses}>
					{overlay.icon}
					<div className="text-sm font-medium">{overlay.title}</div>
					{overlay.desc ? <div className="text-xs opacity-80">{overlay.desc}</div> : null}
				</div>
			) : null}
		</div>
	);
}
