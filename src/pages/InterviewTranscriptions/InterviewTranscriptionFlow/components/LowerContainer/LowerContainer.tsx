import { useVideoUpload } from "@/components/video";
import { PossibleState } from "../../types";
import { InterviewRecordingPropertyForm } from "./VideoUploadQuestionsForm";
import { TranscriptWaitingBlock } from "./TranscriptWaitingBlock";

type Props = {
    state: PossibleState;
	uploadStatus: ReturnType<typeof useVideoUpload>["status"];
	onStateChange: (state: PossibleState) => void;
};

export function LowerContainer({ state, uploadStatus, onStateChange }: Props) {
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
				<article className="prose max-w-none prose-headings:scroll-mt-24">
					Ну тут типа транскрипция будет
				</article>
			)}
		</>
    )
}
