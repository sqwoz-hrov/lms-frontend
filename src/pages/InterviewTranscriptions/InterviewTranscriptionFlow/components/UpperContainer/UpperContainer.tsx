import { PossibleState } from "../../types";
import { VideoPlayerContainer } from "./PlayerContainer";
import { InterviewRecordingPropertyForm } from "../LowerContainer/VideoUploadQuestionsForm";

type Props = {
    state: PossibleState;
};

export function UpperContainer({ state }: Props) {
    const hasVideo = true;
    const video: any = null;

    return (<>
    							
			<VideoPlayerContainer />
		</>
	);
}