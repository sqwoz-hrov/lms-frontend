import { useVideoUpload } from "@/components/video";
import { PossibleState } from "../../types";
import { InterviewRecordingPropertyForm } from "./VideoUploadQuestionsForm";

type Props = {
    state: PossibleState;
	uploadStatus: ReturnType<typeof useVideoUpload>["status"];
};

export function LowerContainer({ state, uploadStatus }: Props) {
    const hasTranscription = false;

    return (
						<>  
		    {/* TODO: something instead of hasTranscription */}
						{!hasTranscription  && (
			<InterviewRecordingPropertyForm videoUploadStatus={uploadStatus}/>
						)}
							{hasTranscription && (
								<article className="prose max-w-none prose-headings:scroll-mt-24">
									Ну тут типа транскрипция будет
								</article>
							)}

						</>
    )
}