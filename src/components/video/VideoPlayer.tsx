/* eslint-disable no-empty */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, Hash, CloudUpload, Clock, XCircle } from "lucide-react";
import { detectKind } from "@/video_engines/detect";
import { createEngine } from "@/video_engines/factory";
import type { Engine, EngineKind } from "@/video_engines/types";

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
	const engineRef = useRef<Engine | null>(null);
	const lastInitSrcRef = useRef<string | null>(null);

	const [fatalError, setFatalError] = useState<string | null>(null);
	const [isBuffering, setIsBuffering] = useState(false);

	const playerPhase: PlayerPhase = phase ?? DEFAULT_PHASE;

	const normalizedType = useMemo(() => {
		if (!type) return "";
		const [mime] = type.split(";");
		return (mime ?? "").trim().toLowerCase();
	}, [type]);

	const isCompletedPhase = playerPhase === "completed";
	const hasSource = Boolean(src);
	const isReadyForPlayback = isCompletedPhase && hasSource && !fatalError;

	const kind: EngineKind | null = useMemo(() => detectKind(src, normalizedType), [src, normalizedType]);
	const isTsSource = kind === "mpegts";

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

	// Основная инициализация источника через движки
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		// Guard от лишних переинициализаций на тот же src
		if (isReadyForPlayback && src && lastInitSrcRef.current === src) {
			return;
		}

		// Cleanup на входе
		try {
			engineRef.current?.destroy();
		} catch {}
		engineRef.current = null;
		video.pause();
		video.removeAttribute("src");
		video.load();

		if (!isReadyForPlayback || !src) return;

		let cancelled = false;
		(async () => {
			try {
				const resolvedKind: EngineKind = kind ?? "native";
				const engine = createEngine(resolvedKind);
				engineRef.current = engine;

				await engine.load(video, src, {
					credentials: corsMode.credentials,
					withCredentials: corsMode.withCredentials,
					crossOrigin: corsMode.crossOrigin,
				});

				if (cancelled) return;
				setIsBuffering(true);
				lastInitSrcRef.current = src;
			} catch (e) {
				if (cancelled) return;
				console.debug(e);
				// Спец-сообщение для MPEG-TS, если mpegts.js не смог
				if (isTsSource) {
					setFatalError("Этот формат (MPEG-TS) не поддерживается вашим браузером. Используйте HLS (.m3u8) или MP4.");
				} else {
					setFatalError(mediaErrorToMessage(video.error));
				}

				try {
					engineRef.current?.destroy();
				} finally {
					engineRef.current = null;
				}
			}
		})();

		return () => {
			cancelled = true;
			try {
				engineRef.current?.destroy();
			} finally {
				engineRef.current = null;
			}
			video.pause();
			video.removeAttribute("src");
			video.load();
		};
	}, [isReadyForPlayback, src, kind, corsMode, isTsSource]);

	// События <video> для отображения буферизации/ошибок
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
			const tsMsg = isTsSource
				? "Этот браузер не воспроизводит MPEG-TS напрямую. Используйте HLS (.m3u8) или MP4."
				: fatalError;

			return {
				icon: <XCircle className="h-6 w-6 text-red-300" />,
				title: "Не удалось воспроизвести видео",
				desc: tsMsg,
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

		if (playerPhase !== "completed") {
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
	}, [fatalError, hasSource, isBuffering, isReadyForPlayback, playerPhase, isTsSource]);

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
