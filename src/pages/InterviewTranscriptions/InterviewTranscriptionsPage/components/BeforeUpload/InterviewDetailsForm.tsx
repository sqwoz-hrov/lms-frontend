import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const INTERVIEW_TYPES = ["Скрининг", "Техническое собеседование", "Систем дизайн"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const SPEAKER_OPTIONS: { value: string; label: string }[] = [
	{ value: "lazy", label: "Мне лень выбирать" },
	...Array.from({ length: 9 }, (_, idx) => {
		const count = idx + 1;
		return { value: String(count), label: `${count}` };
	}),
];

export type InterviewDetailsFormProps = {
	speakerCount: string;
	onSpeakerCountChange: (value: string) => void;
	interviewType: InterviewType | undefined;
	onInterviewTypeChange: (value: InterviewType) => void;
	/** Whether the form can be submitted (video uploaded + type selected) */
	canSubmit: boolean;
	isSubmitting: boolean;
	isAwaitingCompletion: boolean;
	onSubmit: () => void;
};

export function InterviewDetailsForm({
	speakerCount,
	onSpeakerCountChange,
	interviewType,
	onInterviewTypeChange,
	canSubmit,
	isSubmitting,
	isAwaitingCompletion,
	onSubmit,
}: InterviewDetailsFormProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Детали интервью</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-2">
					<Label>Количество участников</Label>
					<Select value={speakerCount} onValueChange={onSpeakerCountChange}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SPEAKER_OPTIONS.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Если укажете точное количество участников собеседования, разбор будет лучше. Если вы не помните – значение «Мне лень выбирать» тоже работает :)
					</p>
				</div>

				<div className="grid gap-2">
					<Label>Тип интервью</Label>
					<Select
						value={interviewType}
						onValueChange={value => onInterviewTypeChange(value as InterviewType)}
						disabled={isSubmitting}
					>
						<SelectTrigger>
							<SelectValue placeholder="Выберите тип интервью" />
						</SelectTrigger>
						<SelectContent>
							{INTERVIEW_TYPES.map(type => (
								<SelectItem key={type} value={type}>
									{type}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{interviewType === "Систем дизайн" && (
						<div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
							<AlertTriangle className="size-4 text-amber-500" />
							<span>Мы не сможем проанализировать что вы нарисовали, но постараемся разобрать ваше интервью на основании диалога с интервьюером</span>
						</div>
					)}
				</div>

				<div className="flex justify-end pt-2">
					<Button
						size="lg"
						disabled={!canSubmit || isSubmitting || isAwaitingCompletion}
						onClick={onSubmit}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Запуск…
							</>
						) : isAwaitingCompletion ? (
							"Ждём завершения…"
						) : (
							"Запустить транскрибацию"
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
