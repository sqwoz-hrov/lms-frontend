import { PossibleState } from "../../types";
import { InterviewRecordingPropertyForm } from "./VideoUploadQuestionsForm";

type Props = {
    state: PossibleState;
};

export function LowerContainer({ state }: Props) {
    const hasTranscription = false;

    return (
						<>  {!hasTranscription && (
			<InterviewRecordingPropertyForm />
						)}
							{hasTranscription && (
								<article className="prose max-w-none prose-headings:scroll-mt-24">
									Ну тут типа транскрипция будет
								</article>
							)}

						</>
    )
}