// src/components/hr/feedback/FeedbackEditorDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FeedbackApi, type BaseFeedbackDto } from "@/api/feedbackApi";

export function FeedbackEditorDialog({
	open,
	onOpenChange,
	interviewId,
	initial,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	interviewId?: string;
	initial?: BaseFeedbackDto | null;
	onSaved?: () => void;
}) {
	const { register, handleSubmit, reset } = useForm<{ markdown_content: string }>({
		defaultValues: { markdown_content: initial?.markdown_content ?? "" },
		values: { markdown_content: initial?.markdown_content ?? "" },
	});

	const m = useMutation({
		mutationFn: async (v: { markdown_content: string }) => {
			if (initial) {
				return FeedbackApi.update({
					id: initial.id,
					interview_id: initial.interview_id,
					markdown_content: v.markdown_content,
				});
			}
			if (!interviewId) throw new Error("interviewId is required to create feedback");
			return FeedbackApi.create({
				interview_id: interviewId,
				markdown_content: v.markdown_content,
				markdown_content_id: "",
			});
		},
		onSuccess: () => {
			onSaved?.();
			onOpenChange(false);
			reset({ markdown_content: "" });
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[720px]">
				<DialogHeader>
					<DialogTitle>{initial ? "Редактировать фидбек" : "Новый фидбек"}</DialogTitle>
				</DialogHeader>

				<form className="space-y-4" onSubmit={handleSubmit(v => m.mutate(v))}>
					<div className="grid gap-2">
						<Label htmlFor="md">Markdown</Label>
						<Textarea
							id="md"
							rows={12}
							placeholder="### Что понравилось\n..."
							{...register("markdown_content", { required: true })}
						/>
					</div>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Отмена
						</Button>
						<Button type="submit" disabled={m.isPending}>
							{m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Сохранить
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
