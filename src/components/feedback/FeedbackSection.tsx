// src/components/hr/feedback/FeedbackSection.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { FeedbackApi, type BaseFeedbackDto } from "@/api/feedbackApi";
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { usePermissions } from "@/hooks/usePermissions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { FeedbackEditorDialog } from "./FeedbackEditorDialog";
import { getInterviews, type BaseInterviewDto, type InterviewType } from "@/api/interviewsApi";

const TYPE_LABEL: Record<InterviewType, string> = {
	screening: "Screening",
	technical_interview: "Technical",
	final: "Final",
	other: "Другое",
};

export function FeedbackSection({ hrConnection }: { hrConnection: BaseHrConnectionDto }) {
	const { canSeeFeedback, canCRUDFeedback } = usePermissions();
	const qc = useQueryClient();

	const canSee = canSeeFeedback();
	const canCrud = canCRUDFeedback();

	// Композитный запрос: все интервью + фидбек по каждому интервью
	const q = useQuery({
		queryKey: ["feedback-by-connection", hrConnection.id],
		queryFn: async () => {
			const interviews = await getInterviews({ hr_connection_id: hrConnection.id });
			const lists = await Promise.all(interviews.map(iv => FeedbackApi.list({ interview_id: iv.id })));
			const byInterview: Record<string, BaseFeedbackDto[]> = {};
			interviews.forEach((iv, idx) => (byInterview[iv.id] = lists[idx] ?? []));
			return { interviews, byInterview } as {
				interviews: BaseInterviewDto[];
				byInterview: Record<string, BaseFeedbackDto[]>;
			};
		},
	});

	const [createForInterviewId, setCreateForInterviewId] = useState<string | null>(null);
	const [editState, setEditState] = useState<{ interviewId: string; feedback: BaseFeedbackDto } | null>(null);

	const invalidateAll = () => qc.invalidateQueries({ queryKey: ["feedback-by-connection", hrConnection.id] });

	if (!canSee) return <div className="text-sm text-muted-foreground">Нет доступа к просмотру фидбека.</div>;

	if (q.isLoading) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<Loader2 className="size-4 animate-spin" /> Загрузка фидбека…
			</div>
		);
	}

	const { interviews, byInterview } = q.data!;

	if (!interviews?.length) {
		return (
			<div className="text-sm text-muted-foreground">
				Пока нет интервью — добавьте интервью, чтобы оставлять фидбек.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{interviews.map(iv => {
				const feedbacks = byInterview[iv.id] || [];
				return (
					<Card key={iv.id}>
						<CardContent className="p-4 space-y-3">
							{/* Заголовок интервью с этапом */}
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<div className="font-medium truncate">{iv.name}</div>
									<div className="text-xs text-muted-foreground">
										Этап: {TYPE_LABEL[iv.type]} • {new Date(iv.created_at).toLocaleString()}
									</div>
								</div>

								{canCrud && (
									<Button size="sm" onClick={() => setCreateForInterviewId(iv.id)}>
										<Plus className="size-4 mr-2" /> Добавить фидбек
									</Button>
								)}
							</div>

							{/* Список фидбеков по этому интервью */}
							{feedbacks.length ? (
								<div className="space-y-3">
									{feedbacks.map(fb => (
										<div key={fb.id} className="rounded-lg border p-3">
											<div className="mb-2 text-xs text-muted-foreground">Этап: {TYPE_LABEL[iv.type]}</div>
											{fb.markdown_content ? (
												<article className="prose max-w-none prose-headings:scroll-mt-24 text-sm">
													<ReactMarkdown remarkPlugins={[remarkGfm]}>{fb.markdown_content}</ReactMarkdown>
												</article>
											) : (
												<div className="text-xs text-muted-foreground">Пустой фидбек.</div>
											)}

											{canCrud && (
												<div className="mt-3 flex items-center gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => setEditState({ interviewId: iv.id, feedback: fb })}
													>
														<Pencil className="size-4 mr-2" /> Редактировать
													</Button>
													<Button
														variant="destructive"
														size="sm"
														disabled
														title="Удаление недоступно: нет DELETE /feedback в API"
													>
														<Trash2 className="size-4 mr-2" /> Удалить
													</Button>
												</div>
											)}
										</div>
									))}
								</div>
							) : (
								<div className="text-sm text-muted-foreground">Фидбеков пока нет.</div>
							)}
						</CardContent>
					</Card>
				);
			})}

			{/* Создание */}
			<FeedbackEditorDialog
				open={!!createForInterviewId}
				onOpenChange={v => setCreateForInterviewId(v ? createForInterviewId : null)}
				interviewId={createForInterviewId ?? undefined}
				onSaved={invalidateAll}
			/>

			{/* Редактирование */}
			<FeedbackEditorDialog
				open={!!editState}
				onOpenChange={v => setEditState(v ? editState : null)}
				interviewId={editState?.interviewId}
				initial={editState?.feedback}
				onSaved={invalidateAll}
			/>
		</div>
	);
}
