import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { CopyIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UpperContainer } from "./components/UpperContainer/UpperContainer";
import { PossibleState } from "./types";
import { LowerContainer } from "./components/LowerContainer/LowerContainer";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useInterviewTranscriptionStatus } from "@/hooks/useInterviewTranscriptionStatus";


const MOCK_UPLOAD_VIDEO = true;
// Duration in ms to simulate transcription processing in mock mode
const MOCK_TRANSCRIPTION_DURATION = 5000;


export default function InterviewTranscriptionFlowPage() {
    const [state, setState] = useState<PossibleState>('empty');
    const [videoId, setVideoId] = useState<string | undefined>(undefined);

	const navigate = useNavigate();

    // TODO move to lower container componenet I guess
	const copyTranscript = useMemo(() => {
        if (state === 'complete' as PossibleState) return <CopyIcon className="h-5 w-5" />;
        return <></>;
	}, [state]);

	// Handle SSE events for transcription status changes
	const handleTranscriptionComplete = useCallback(() => {
		setState('complete');
	}, []);

	const handleTranscriptionError = useCallback(() => {
		setState('transcribe_error');
	}, []);

	useInterviewTranscriptionStatus({
		videoId,
		onComplete: handleTranscriptionComplete,
		onError: handleTranscriptionError,
	});

	// Mock mode: simulate transcription completion after delay
	useEffect(() => {
		if (!MOCK_UPLOAD_VIDEO) return;
		if (state !== 'transcribe_video') return;

		const timer = setTimeout(() => {
			setState('complete');
		}, MOCK_TRANSCRIPTION_DURATION);

		return () => clearTimeout(timer);
	}, [state]);

	{/* TODO: the page progress resets when you go away :) */}
    const uploadState = useVideoUpload({
		mockMode: MOCK_UPLOAD_VIDEO,
		mockDuration: 3000,
		mockErrorProbability: 0,
		onUploadComplete: (video) => {
            // Store the video ID for SSE listening and transcription fetching
			setVideoId(video.id);
		},
		onUploadError: (error) => {
            // TODO: show like red stuff and everything
			console.error("Upload error:", error);
			setState('upload_error');
		},
	});

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="text-2xl font-semibold tracking-tight">Название собеса / загрузите собес</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="secondary" onClick={() => navigate(-1)}>
						Назад
					</Button>
				</div>
			</div>

			<Card className="mb-6">
                {/* TODO remove? */}
				{true && (
					<CardHeader>
						<CardTitle className="text-base">Содержание</CardTitle>
					</CardHeader>
				)}

				<CardContent className={"space-y-6"}>
                    <UpperContainer state={state} uploadState={uploadState} />
                    <LowerContainer state={state} uploadStatus={uploadState.status} onStateChange={setState} videoId={videoId} />
				</CardContent>
			</Card>
		</div>
	);
}