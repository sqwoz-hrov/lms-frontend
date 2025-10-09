import type { UserResponse } from "@/api/usersApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { ALL } from "./constants";

type Props = {
	users?: Pick<UserResponse, "id" | "name" | "role">[];
	studentUserId?: string;
	mentorUserId?: string;
	onChangeStudent(v?: string): void;
	onChangeMentor(v?: string): void;
	isAdmin: boolean;
	showStudentFilter: boolean;
	onCreateTask(): void;
};

export function FiltersBar({
	users,
	studentUserId,
	mentorUserId,
	onChangeStudent,
	onChangeMentor,
	isAdmin,
	showStudentFilter,
	onCreateTask,
}: Props) {
	return (
		<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">Доска задач</h1>
				{showStudentFilter && studentUserId && (
					<Badge variant="outline">студент: {users?.find(u => u.id === studentUserId)?.name ?? studentUserId}</Badge>
				)}
				{mentorUserId && (
					<Badge variant="outline">ментор: {users?.find(u => u.id === mentorUserId)?.name ?? mentorUserId}</Badge>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{/* Student filter */}
				{showStudentFilter && (
					<Select value={studentUserId ?? ALL} onValueChange={v => onChangeStudent(v === ALL ? undefined : v)}>
						<SelectTrigger className="w-64">
							<SelectValue placeholder="Все студенты" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL}>Все студенты</SelectItem>
							{(users || []).map(u => (
								<SelectItem key={u.id} value={u.id}>
									<div className="flex items-center gap-2">
										<span className="h-3 w-3 rounded-full border" />
										<span className="truncate max-w-[18rem]">{u.name}</span>
										<span className="ml-1 text-[10px] text-muted-foreground">({u.role})</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* Mentor filter */}
				<Select value={mentorUserId ?? ALL} onValueChange={v => onChangeMentor(v === ALL ? undefined : v)}>
					<SelectTrigger className="w-64">
						<SelectValue placeholder="Все менторы" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Все менторы</SelectItem>
						{(users || [])
							.filter(u => u.role === "admin")
							.map(u => (
								<SelectItem key={u.id} value={u.id}>
									<div className="flex items-center gap-2">
										<span className="h-3 w-3 rounded-full border" />
										<span className="truncate max-w-[18rem]">{u.name}</span>
										<span className="ml-1 text-[10px] text-muted-foreground">({u.role})</span>
									</div>
								</SelectItem>
							))}
					</SelectContent>
				</Select>

				{isAdmin && (
					<Button onClick={onCreateTask}>
						<Plus className="h-4 w-4 mr-2" /> Новая задача
					</Button>
				)}
			</div>
		</div>
	);
}
