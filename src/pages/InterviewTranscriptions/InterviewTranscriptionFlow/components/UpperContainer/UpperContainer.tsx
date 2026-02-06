import { PossibleState } from "../../types";
import { InterviewRecordingPropertyForm } from "../LowerContainer/VideoUploadQuestionsForm";
import { useVideoUpload } from "@/components/video";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoPlayerPlaceholder } from "./VideoUploadPlayerPlaceholder";

type Props = {
    state: PossibleState;
	uploadState: ReturnType<typeof useVideoUpload>;
};

type VideoMetadataProps = {
    hasVideo: boolean;
    video?: any; // TODO: this is response from GetVideoById
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

export function UpperContainer({ state, uploadState }: Props) {
	// TODO: GetById
	const video = uploadState.video;
	// TODO add re-fetch
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
									{video && 
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
			{/* TODO: fix the links, etc from GetById */}
            {video ? <VideoPlayer src={video.youtube_link || ''} type={video.mime_type} title={video.filename} /> : <VideoPlayerPlaceholder upload={uploadState} />}
            {video && <VideoMetadata hasVideo={!!video} video={video} videoLoading={uploadState.progress.sent < uploadState.progress.total} refetchVideo={refetchVideo} />}
		</section>
        </>									
    );

}