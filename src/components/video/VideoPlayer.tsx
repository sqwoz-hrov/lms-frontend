type Props = {
	src: string;
	type?: string | null;
	title?: string;
	poster?: string;
};

export function VideoPlayer({ src, type, title, poster }: Props) {
	return (
		<div className="w-full">
			<video
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
