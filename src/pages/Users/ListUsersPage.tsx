import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AuthApi, type UserResponse } from "@/api/usersApi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AtSign, Mail, Plus } from "lucide-react";

export function ListUsersPage() {
	const navigate = useNavigate();
	const [q, setQ] = useState("");

	const {
		data: users,
		isLoading,
		isError,
		refetch,
	} = useQuery<UserResponse[]>({
		queryKey: ["users"],
		queryFn: AuthApi.getUsers,
		staleTime: 60_000,
	});

	const filtered = useMemo(() => {
		if (!users) return [] as UserResponse[];
		const query = q.trim().toLowerCase();
		if (!query) return users;
		return users.filter(u =>
			[u.name, u.email, u.telegram_username, u.role].some(v =>
				String(v || "")
					.toLowerCase()
					.includes(query),
			),
		);
	}, [users, q]);

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl font-semibold tracking-tight">Пользователи</h1>
				<div className="flex items-center gap-2">
					<Input
						value={q}
						onChange={e => setQ(e.target.value)}
						placeholder="Поиск по имени, email или Telegram"
						className="w-64"
					/>
					<Button onClick={() => navigate("/users/new")}>
						<Plus className="mr-2 h-4 w-4" /> Добавить пользователя
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="min-h-[40vh] grid place-items-center text-muted-foreground">Загрузка…</div>
			) : isError ? (
				<div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
					<p className="text-sm text-red-600">Не удалось загрузить список пользователей.</p>
					<Button onClick={() => refetch()}>Повторить</Button>
				</div>
			) : !users || users.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-sm text-muted-foreground">Пока нет ни одного пользователя.</p>
						<Button onClick={() => navigate("/users/new")}>Добавить первого</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Всего: {filtered.length}</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[36%]">Имя</TableHead>
									<TableHead className="w-[28%]">Email</TableHead>
									<TableHead className="w-[24%]">Telegram</TableHead>
									<TableHead className="w-[12%] text-right">Роль</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map(u => (
									<TableRow key={u.id} className="hover:bg-muted/40">
										<TableCell className="font-medium">{u.name}</TableCell>
										<TableCell>
											<a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${u.email}`}>
												<Mail className="h-4 w-4" />
												{u.email}
											</a>
										</TableCell>
										<TableCell>
											{u.telegram_username ? (
												<a
													className="inline-flex items-center gap-1 hover:underline"
													href={`https://t.me/${stripAt(u.telegram_username)}`}
													target="_blank"
													rel="noreferrer"
												>
													<AtSign className="h-4 w-4" />@{stripAt(u.telegram_username)}
												</a>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="text-right">
											<RoleBadge role={u.role} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function RoleBadge({ role }: { role: UserResponse["role"] }) {
	if (role === "admin") return <Badge>admin</Badge>;
	return <Badge variant="secondary">user</Badge>;
}

function stripAt(v?: string) {
	if (!v) return "";
	return v.startsWith("@") ? v.slice(1) : v;
}
