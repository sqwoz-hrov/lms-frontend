// src/components/hr/HrConnectionDrawer.tsx
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { HrConnectionsApi } from "@/api/hrConnectionsApi";
import { FeedbackSection } from "@/components/feedback/FeedbackSection";
import { InterviewsSection } from "@/components/interviews/InterviewsSection";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDeletionDialog } from "@/components/common/dialogs/ConfirmDeletionDialog";
import { useLocation } from "react-router-dom";
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
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
	const copyResetTimeout = useRef<number | null>(null);
	const location = useLocation();

	const del = useMutation({
		mutationFn: async () => {
			if (!conn) return;
			await HrConnectionsApi.remove(conn.id);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["hr-connections"] });
			setDeleteOpen(false);
			onOpenChange(false);
		},
	});

	const shareUrl = useMemo(() => {
		if (!conn || typeof window === "undefined") return "";
		const url = new URL(window.location.href);
		url.searchParams.set("hr_connection_id", conn.id);
		return url.toString();
	}, [conn?.id, location.key, location.pathname, location.search, location.hash]);

	const handleCopyLink = useCallback(async () => {
		if (!shareUrl) return;
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(shareUrl);
			} else {
				const textarea = document.createElement("textarea");
				textarea.value = shareUrl;
				textarea.setAttribute("readonly", "");
				textarea.style.position = "absolute";
				textarea.style.left = "-9999px";
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}
			setCopyStatus("success");
		} catch {
			setCopyStatus("error");
		} finally {
			if (copyResetTimeout.current) {
				window.clearTimeout(copyResetTimeout.current);
			}
			copyResetTimeout.current = window.setTimeout(() => {
				setCopyStatus("idle");
				copyResetTimeout.current = null;
			}, 2000);
		}
	}, [shareUrl]);

	useEffect(() => {
		return () => {
			if (copyResetTimeout.current) {
				window.clearTimeout(copyResetTimeout.current);
				copyResetTimeout.current = null;
			}
		};
	}, []);

	useEffect(() => {
		setCopyStatus("idle");
		if (copyResetTimeout.current) {
			window.clearTimeout(copyResetTimeout.current);
			copyResetTimeout.current = null;
		}
	}, [conn?.id]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* ключевые изменения: max-h и flex layout */}
			<DialogContent className="sm:max-w-[1000px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
				{conn ? (
					<>
						{/* хедер фиксированной высоты */}
						<div className="border-b p-4 shrink-0">
							<HrConnectionHeader
								conn={conn}
								onEdit={() => setEditOpen(true)}
								onDelete={() => setDeleteOpen(true)}
								onCopyLink={handleCopyLink}
								copyStatus={copyStatus}
							/>
						</div>

						{/* Tabs растягиваются на оставшееся место */}
						<Tabs defaultValue="interviews" className="w-full flex-1 min-h-0 flex flex-col">
							<div className="px-4 pt-3 shrink-0">
								<TabsList>
									<TabsTrigger value="interviews">Интервью</TabsTrigger>
									<TabsTrigger value="feedback">Фидбек</TabsTrigger>
								</TabsList>
							</div>

							<TabsContent value="interviews" className="p-4 flex-1 min-h-0 overflow-y-auto">
								<InterviewsSection hrConnection={conn} />
							</TabsContent>

							<TabsContent value="feedback" className="p-4 flex-1 min-h-0 overflow-y-auto">
								<FeedbackSection hrConnection={conn} />
							</TabsContent>
						</Tabs>
					</>
				) : (
					<div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
						Данные контакта загружаются…
					</div>
				)}
			</DialogContent>

			{conn && <HrConnectionFormDialog open={editOpen} onOpenChange={setEditOpen} initial={conn} />}
			{conn && (
				<ConfirmDeletionDialog
					entityName="контакт"
					open={deleteOpen}
					onOpenChange={setDeleteOpen}
					onConfirm={() => del.mutate()}
					description="Контакт и все связанные интервью и фидбек будут удалены без возможности восстановления."
					pending={del.isPending}
				/>
			)}
		</Dialog>
	);
}
