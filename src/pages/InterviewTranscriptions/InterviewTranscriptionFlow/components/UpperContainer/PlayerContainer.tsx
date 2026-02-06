import { VideoPlayer } from "@/components/video/VideoPlayer";
import { UploadIcon } from "lucide-react";

type VideoMetadataProps = {
    hasVideo: boolean;
    video: any;
    videoLoading: boolean;
    refetchVideo: () => Promise<void> | void;
}

function VideoMetadata({ hasVideo, video, videoLoading, refetchVideo }: VideoMetadataProps) {
    return (

    <div className="mt-3 text-xs text-muted-foreground">
										Видео ID: <code>{"<VIDEO_ID>"}</code>
										{hasVideo ? (
											<>
												{" "}
												• Статус: <code>{"<VIDEO_STATUS>"}</code>
											</>
										) : null}
										{hasVideo && video?.mime_type ? (
											<>
												{" "}
												• MIME: <code>{video.mime_type}</code>
											</>
										) : null}
										{!video?.video_url && !videoLoading && (
											<>
												{" "}
												•{" "}
												<button className="underline underline-offset-4" onClick={() => refetchVideo()}>
													обновить ссылку
												</button>
											</>
										)}
									</div>
    )
}
function VideoPlayerPlaceholder() {
    return (
        <div className="flex h-80 items-center justify-center rounded-md border bg-muted">
			<UploadIcon className="h-12 w-12 text-muted-foreground m-2" />
            <span className="text-base text-muted-foreground">Загрузите видео</span>
        </div>
    );
}

// todo: get video id in here somehow?
export function VideoPlayerContainer() {
    const hasVideo = false;
    const video: any = null;
    const videoLoading = false;
    const refetchVideo = () => {};

    return (
        <><section>
            {/* TODO maybe add poster to video player? */}
{/* <VideoPlayer
										src={video?.video_url}
										type={video?.mime_type ?? "video/mp4"}
										title={material.name}
										phase={toPlayerPhase(video?.phase)}
									/> */}
									{hasVideo && 
									<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
										<h2 className="text-base font-semibold">Видео</h2>
										<div className="flex items-center gap-2">
											{/* {videoLoading ? (
												<span className="text-xs text-muted-foreground">Загрузка ссылки…</span>
											) : videoError ? (
												<Button size="sm" variant="secondary" onClick={() => refetchVideo()}>
													Обновить ссылку
												</Button>
											) : null} */}

                                            ZALUPKINS
										</div>
									</div>
									}
            {hasVideo && video ? <VideoPlayer src={video.video_url} type={video.mime_type} title={video.title} /> : <VideoPlayerPlaceholder />}
            {hasVideo && video && <VideoMetadata hasVideo={hasVideo} video={video} videoLoading={videoLoading} refetchVideo={refetchVideo} />}
		</section>
        </>									
    );
}