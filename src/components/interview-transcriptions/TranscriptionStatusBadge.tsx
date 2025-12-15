import type { InterviewTranscriptionResponseDto } from "@/api/interviewTranscriptionsApi";
import { Badge } from "@/components/ui/badge";

type Props = {
	status: InterviewTranscriptionResponseDto["status"];
};

const STATUS_VARIANTS: Record<
	InterviewTranscriptionResponseDto["status"],
	{ label: string; variant: "secondary" | "outline" }
> = {
	done: { label: "Готово", variant: "secondary" },
	processing: { label: "В работе", variant: "outline" },
	created: { label: "Создано", variant: "outline" },
};

export function TranscriptionStatusBadge({ status }: Props) {
	const config = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.created;
	return <Badge variant={config.variant}>{config.label}</Badge>;
}
