// src/components/hr/HrConnectionHeader.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Link2, Pencil, Trash2 } from "lucide-react";
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { usePermissions } from "@/hooks/usePermissions";

import { getUsers, type UserResponse } from "@/api/usersApi";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type HrConnectionHeaderProps = {
	conn: BaseHrConnectionDto;
	onEdit?: () => void;
	onDelete?: () => void;
};

const STATUS_LABEL: Record<BaseHrConnectionDto["status"], string> = {
	waiting_us: "Ждём нас",
	waiting_hr: "Ждём HR",
	rejected: "Отказ",
	offer: "Оффер",
};

export function HrConnectionHeader({ conn, onEdit, onDelete }: HrConnectionHeaderProps) {
	const { isAdmin, canCRUDHrConnection } = usePermissions();
	const canCrud = canCRUDHrConnection(conn);

	// ⬇️ грузим пользователей и фильтруем студентов
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
						</div>

						<div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
							{isAdmin && (
								<div className="shrink-0">
									<span className="font-medium text-foreground/80">Студент:</span>{" "}
									{isLoading ? (
										<span>загрузка…</span>
									) : isError ? (
										<span className="text-destructive">ошибка загрузки</span>
									) : student ? (
										<span className="inline-flex items-center gap-2">
											<span className="text-foreground">{student.name}</span>
											{student.telegram_username && (
												<span className="text-muted-foreground">@{student.telegram_username}</span>
											)}
											{/* тонкий id для отладки/копирования при необходимости */}
											<span className="text-xs text-muted-foreground/70" title={student.email}>
												(id: {student.id})
											</span>
										</span>
									) : (
										<span className="text-muted-foreground" title={conn.student_user_id}>
											не найден (id: {conn.student_user_id})
										</span>
									)}
								</div>
							)}

							{conn.chat_link && (
								<a
									href={conn.chat_link}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-primary hover:underline"
								>
									<Link2 className="size-4" /> Открыть чат <ExternalLink className="size-3" />
								</a>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2 self-start">
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
