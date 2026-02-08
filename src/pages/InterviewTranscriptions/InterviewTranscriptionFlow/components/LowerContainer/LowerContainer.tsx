import { useVideoUpload } from "@/components/video";
import { PossibleState } from "../../types";
import { InterviewRecordingPropertyForm } from "./VideoUploadQuestionsForm";
import { TranscriptWaitingBlock } from "./TranscriptWaitingBlock";
import { TranscriptResultBlock } from "./TranscriptResultBlock";

type Props = {
    state: PossibleState;
	uploadStatus: ReturnType<typeof useVideoUpload>["status"];
	onStateChange: (state: PossibleState) => void;
	videoId?: string;
};

export function LowerContainer({ state, uploadStatus, onStateChange, videoId }: Props) {
    const hasTranscription = state === 'complete';
    const isTranscribing = state === 'transcribe_video';
    const showForm = state === 'empty' || state === 'upload_video';

    return (
		<>  
			{showForm && (
				<InterviewRecordingPropertyForm 
					videoUploadStatus={uploadStatus}
					onStateChange={onStateChange}
				/>
			)}
			{isTranscribing && (
				<TranscriptWaitingBlock />
			)}
			{hasTranscription && (
				<TranscriptResultBlock videoId={videoId} />
			)}
		</>
    )
}
