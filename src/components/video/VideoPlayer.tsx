import { Loader2, Hash, CloudUpload, Clock, XCircle } from "lucide-react";

type Props = {
	src?: string;
	phase?: "receiving" | "hashing" | "uploading_s3" | "completed" | "failed";
	type?: string | null;
	title?: string;
	poster?: string;
};

const PHASE_COPY: Record<NonNullable<Props["phase"]>, { title: string; desc?: string; icon: React.ReactNode }> = {
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
		icon: <></>,
	},
	failed: {
		title: "Не удалось обработать видео",
		desc: "Попробуйте обновить страницу чуть позже или перезагрузить видео.",
		icon: <XCircle className="h-5 w-5" />,
	},
};

export function VideoPlayer({ src, type, title, poster, phase }: Props) {
	const showProcessing = !src || phase !== "completed";
	const state = PHASE_COPY[phase ?? "receiving"];

	if (showProcessing) {
		const isError = phase === "failed";
		return (
			<div className="relative w-full overflow-hidden rounded-lg border" role="status" aria-live="polite">
				{/* Постер в фоне, если есть */}
				{poster ? (
					<img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
				) : null}

				<div className="relative z-10 flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
					<div className={`flex items-center gap-2 ${isError ? "text-red-600" : "text-gray-700"}`}>
						{isError ? state.icon : <Loader2 className="h-5 w-5 animate-spin" />}
						<span className="font-medium">{state.title}</span>
					</div>
					{state.desc ? (
						<p className="max-w-prose text-sm text-muted-foreground">{state.desc}</p>
					) : (
						<p className="max-w-prose text-sm text-muted-foreground">Видео обрабатывается, попробуйте чуть позже.</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			<video
				key={src} // гарантирует обновление плеера при смене src
				className="w-full max-h-[70vh] rounded-lg border"
				controls
				playsInline
				preload="metadata"
				poster={poster}
				controlsList="nodownload noplaybackrate"
				disablePictureInPicture
			>
				<source src={src} type={type ?? "video/mp4"} />
				{title ? <track kind="captions" srcLang="en" label={title} /> : null}
				Ваш браузер не поддерживает воспроизведение видео.
			</video>
		</div>
	);
}
