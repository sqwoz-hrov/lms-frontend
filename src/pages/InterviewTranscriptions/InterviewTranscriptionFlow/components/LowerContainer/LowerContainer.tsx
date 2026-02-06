import { useVideoUpload } from "@/components/video";
import { PossibleState } from "../../types";
import { InterviewRecordingPropertyForm } from "./VideoUploadQuestionsForm";
import { Loader2 } from "lucide-react";

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
				<div className="flex items-center justify-center gap-3 py-12">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
					<span className="text-xl">Идёт распознавание...</span>
				</div>
			)}
			{hasTranscription && (
				<article className="prose max-w-none prose-headings:scroll-mt-24">
					Ну тут типа транскрипция будет
				</article>
			)}
		</>
    )
}