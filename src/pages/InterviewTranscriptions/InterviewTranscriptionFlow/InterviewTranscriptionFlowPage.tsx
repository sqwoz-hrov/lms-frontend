import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { CopyIcon } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UpperContainer } from "./components/UpperContainer/UpperContainer";
import { PossibleState } from "./types";
import { LowerContainer } from "./components/LowerContainer/LowerContainer";



export default function InterviewTranscriptionFlowPage() {
    const state: PossibleState = 'empty';

	const navigate = useNavigate();

    // TODO move to lower container componenet I guess
	const copyTranscript = useMemo(() => {
        if (state === 'complete' as PossibleState) return <CopyIcon className="h-5 w-5" />;
        return <></>;
	}, [state]);

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
                    <UpperContainer state={state} />
                    <LowerContainer state={state} />
				</CardContent>
			</Card>
		</div>
	);
}