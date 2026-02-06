import { Loader2 } from "lucide-react";

export function TranscriptWaitingBlock() {
	return (<div className="flex items-center justify-center gap-3 py-12">
		<Loader2 className="h-6 w-6 animate-spin text-primary" />
		<span className="text-xl">Идёт распознавание...</span>
	</div>);
}