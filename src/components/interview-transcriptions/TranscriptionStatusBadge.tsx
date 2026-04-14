import type { InterviewTranscriptionResponseDto } from "@/api/interviewTranscriptionsApi";
import { Badge } from "@/components/ui/badge";

type Props = {
	status: InterviewTranscriptionResponseDto["status"];
};

const STATUS_VARIANTS: Record<
	InterviewTranscriptionResponseDto["status"],
	{ label: string; variant: "secondary" | "outline"; className?: string }
> = {
	done: { label: "Готово", variant: "secondary" },
	processing: { label: "В работе", variant: "outline" },
	created: { label: "Создано", variant: "outline" },
	restarted: { label: "Перезапущено", variant: "outline" },
	failed: {
		label: "Ошибка",
		variant: "outline",
		className: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
	},
	cancelled: {
		label: "Отменено",
		variant: "outline",
		className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
	},
};

export function TranscriptionStatusBadge({ status }: Props) {
	const config = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.created;
	return (
		<Badge variant={config.variant} className={config.className}>
			{config.label}
		</Badge>
	);
}
