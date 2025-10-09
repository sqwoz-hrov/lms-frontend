// src/components/hr/HrConnectionHeader.tsx
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { Check, Copy, Link2, Pencil, Trash2, XCircle } from "lucide-react";

import { getUsers, type UserResponse } from "@/api/usersApi";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type HrConnectionHeaderProps = {
	conn: BaseHrConnectionDto;
	onEdit?: () => void;
	onDelete?: () => void;
	onCopyLink?: () => void;
	copyStatus?: "idle" | "success" | "error";
};

const STATUS_LABEL: Record<BaseHrConnectionDto["status"], string> = {
	waiting_us: "Ждём нас",
	waiting_hr: "Ждём HR",
	rejected: "Отказ",
	offer: "Оффер",
};

export function HrConnectionHeader({
	conn,
	onEdit,
	onDelete,
	onCopyLink,
	copyStatus = "idle",
}: HrConnectionHeaderProps) {
	const { isAdmin, canCRUDHrConnection } = usePermissions();
	const canCrud = canCRUDHrConnection(conn);

	const {
		data: users,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ["users"],
		queryFn: getUsers,
		staleTime: 60_000,
	});

	const students: UserResponse[] = useMemo(() => (users ?? []).filter(u => u.role === "user"), [users]);

	const studentMap = useMemo(() => {
		const map = new Map<string, UserResponse>();
		for (const s of students) map.set(s.id, s);
		return map;
	}, [students]);

	const student = studentMap.get(conn.student_user_id);

	return (
		<Card className="border-none shadow-none">
			<CardContent className="px-0 pt-0">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-3 flex-wrap">
							<h2 className="text-xl font-semibold truncate">{conn.name}</h2>
							<Badge
								variant={conn.status === "offer" ? "default" : conn.status === "rejected" ? "destructive" : "secondary"}
							>
								{STATUS_LABEL[conn.status]}
							</Badge>
							<Badge variant="outline">Создано: {new Date(conn.created_at).toLocaleDateString()}</Badge>
						</div>

						<div className="mt-3 grid gap-1 text-sm text-muted-foreground">
							<div>
								<span className="font-medium text-foreground/80">Студент:</span>{" "}
								{isAdmin ? (
									isLoading ? (
										<span>загрузка…</span>
									) : isError ? (
										<span className="text-destructive">ошибка загрузки</span>
									) : student ? (
										<span className="inline-flex flex-wrap items-center gap-2 text-foreground">
											<span>{student.name}</span>
											{student.telegram_username && (
												<span className="text-muted-foreground">@{student.telegram_username}</span>
											)}
										</span>
									) : (
										<span className="text-muted-foreground">не найден</span>
									)
								) : (
									<span>—</span>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 self-start">
						{conn.chat_link && (
							<Button size="sm" variant="outline" asChild>
								<a href={conn.chat_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
									<Link2 className="size-4" />
									Открыть чат
								</a>
							</Button>
						)}
						{onCopyLink && (
							<Button size="sm" variant="outline" onClick={onCopyLink} type="button" className="whitespace-nowrap">
								{copyStatus === "success" ? (
									<Check className="size-4" />
								) : copyStatus === "error" ? (
									<XCircle className="size-4" />
								) : (
									<Copy className="size-4" />
								)}
								{copyStatus === "success" ? "Скопировано" : copyStatus === "error" ? "Ошибка" : "Скопировать ссылку"}
							</Button>
						)}
						{canCrud && (
							<>
								<Button size="sm" variant="outline" onClick={onEdit}>
									<Pencil className="size-4 mr-2" /> Редактировать
								</Button>
								<Button size="sm" variant="destructive" onClick={onDelete}>
									<Trash2 className="size-4 mr-2" /> Удалить
								</Button>
							</>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
