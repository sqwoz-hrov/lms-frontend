// src/components/hr/HrConnectionDrawer.tsx
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { HrConnectionsApi } from "@/api/hrConnectionsApi";
import { FeedbackSection } from "@/components/feedback/FeedbackSection";
import { InterviewsSection } from "@/components/interviews/InterviewsSection";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { HrConnectionFormDialog } from "./HrConnectionFormDialog";
import { HrConnectionHeader } from "./HrConnectionHeader";

export type HrConnectionDrawerProps = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	conn: BaseHrConnectionDto | null;
};

export function HrConnectionDrawer({ open, onOpenChange, conn }: HrConnectionDrawerProps) {
	const qc = useQueryClient();
	const [editOpen, setEditOpen] = useState(false);

	const del = useMutation({
		mutationFn: async () => {
			if (!conn) return;
			await HrConnectionsApi.remove(conn.id);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["hr-connections"] });
			onOpenChange(false);
		},
	});

	if (!conn) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* ключевые изменения: max-h и flex layout */}
			<DialogContent className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
				{/* хедер фиксированной высоты */}
				<div className="border-b p-4 shrink-0">
					<HrConnectionHeader
						conn={conn}
						onEdit={() => setEditOpen(true)}
						onDelete={() => {
							const ok = window.confirm("Удалить контакт и все связанные интервью и фидбек?");
							if (ok) del.mutate();
						}}
					/>
				</div>

				{/* Tabs растягиваются на оставшееся место */}
				<Tabs defaultValue="general" className="w-full flex-1 min-h-0 flex flex-col">
					<div className="px-4 pt-3 shrink-0">
						<TabsList>
							<TabsTrigger value="general">Общее</TabsTrigger>
							<TabsTrigger value="interviews">Интервью</TabsTrigger>
							<TabsTrigger value="feedback">Фидбек</TabsTrigger>
						</TabsList>
					</div>

					{/* general можно оставить как есть */}
					<TabsContent value="general" className="p-4">
						<div className="grid gap-2 text-sm">
							<div>
								<span className="text-muted-foreground">ID:</span> {conn.id}
							</div>
							<div>
								<span className="text-muted-foreground">Создано:</span> {new Date(conn.created_at).toLocaleString()}
							</div>
							<div>
								<span className="text-muted-foreground">Статус:</span> {conn.status}
							</div>
							<div>
								<span className="text-muted-foreground">Чат:</span> {conn.chat_link || "—"}
							</div>
							<div>
								<span className="text-muted-foreground">Студент:</span> {conn.student_user_id}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="interviews" className="p-4 flex-1 min-h-0 overflow-y-auto">
						<InterviewsSection hrConnection={conn} />
					</TabsContent>

					<TabsContent value="feedback" className="p-4 flex-1 min-h-0 overflow-y-auto">
						<FeedbackSection hrConnection={conn} />
					</TabsContent>
				</Tabs>
			</DialogContent>

			<HrConnectionFormDialog open={editOpen} onOpenChange={setEditOpen} initial={conn} />
		</Dialog>
	);
}
