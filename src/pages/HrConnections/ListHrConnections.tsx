// src/pages/HrConnections/ListHrConnectionsPage.tsx
import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";

import type { BaseHrConnectionDto, HrStatus } from "@/api/hrConnectionsApi";
import { usePermissions } from "@/hooks/usePermissions";
import { useHrConnectionsQuery } from "@/hooks/useHrConnectionsQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { HrConnectionDrawer } from "@/components/hr/HrConnectionDrawer";
import { HrConnectionFormDialog } from "@/components/hr/HrConnectionFormDialog";
import { useSearchParams } from "react-router-dom";
import { UsersLoader } from "@/components/users/UsersLoader";
import { UserSelectFilter } from "@/components/users/UserSelectFilter";

// ---- Status filter helpers ----
type StatusFilterValue = HrStatus | "all";
const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
	{ value: "all", label: "Все статусы" },
	{ value: "waiting_us", label: "Ждём нас" },
	{ value: "waiting_hr", label: "Ждём HR" },
	{ value: "rejected", label: "Отказ" },
	{ value: "offer", label: "Оффер" },
];

export default function ListHrConnectionsPage() {
	const { isAdmin } = usePermissions();
	return (
		<UsersLoader roles={["user", "admin"]} enabled={isAdmin}>
			<ListHrConnectionsPageContent isAdmin={isAdmin} />
		</UsersLoader>
	);
}

type ListHrConnectionsPageContentProps = {
	isAdmin: boolean;
};

function ListHrConnectionsPageContent({ isAdmin }: ListHrConnectionsPageContentProps) {
	const { filters, setFilters, query } = useHrConnectionsQuery();
	const [searchParams, setSearchParams] = useSearchParams();

	const [createOpen, setCreateOpen] = useState(false);

	// Локальные контролы фильтров (с дебаунсом для имени)
	const [nameInput, setNameInput] = useState(filters.name ?? "");
	const debouncedName = useDebouncedValue(nameInput, 400);

	// Сайд-эффект: менять фильтр name по debounce
	React.useEffect(() => {
		if (debouncedName !== (filters.name ?? "")) {
			setFilters({ ...filters, name: debouncedName || undefined });
		}
	}, [debouncedName]);

	const data = query.data ?? [];
	const isLoading = query.isLoading || query.isFetching;

	const activeConnectionId = searchParams.get("hr_connection_id");
	const selected = React.useMemo(() => {
		if (!activeConnectionId) return null;
		return data.find(conn => conn.id === activeConnectionId) ?? null;
	}, [data, activeConnectionId]);
	const drawerOpen = Boolean(activeConnectionId);

	function resetFilters() {
		setNameInput("");
		setFilters({ status: undefined, name: undefined, student_user_id: isAdmin ? undefined : filters.student_user_id });
	}

	function onRowClick(conn: BaseHrConnectionDto) {
		const next = new URLSearchParams(searchParams);
		next.set("hr_connection_id", conn.id);
		setSearchParams(next);
	}

	function closeDrawer() {
		if (!activeConnectionId) return;
		const next = new URLSearchParams(searchParams);
		next.delete("hr_connection_id");
		setSearchParams(next);
	}

	return (
		<div className="mx-auto w-full max-w-6xl p-4 space-y-4">
			<header className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Контакты с HR</h1>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus className="mr-2 size-4" /> Новый контакт
				</Button>
			</header>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Фильтры</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div className="grid gap-2">
						<Label htmlFor="filter-name">Название</Label>
						<Input
							id="filter-name"
							value={nameInput}
							onChange={e => setNameInput(e.target.value)}
							placeholder="Например: Acme"
						/>
					</div>

					<div className="grid gap-2">
						<Label>Статус</Label>
						<Select
							value={(filters.status as StatusFilterValue | undefined) ?? "all"}
							onValueChange={(v: StatusFilterValue) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
						>
							<SelectTrigger>
								<SelectValue placeholder="Выберите статус" />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map(o => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{isAdmin && (
						<UserSelectFilter
							label="Студент"
							value={filters.student_user_id}
							onChange={value => setFilters({ ...filters, student_user_id: value })}
							allowedRoles={["user"]}
							allLabel="Все студенты"
						/>
					)}

					<div className="flex items-end gap-2">
						<Button variant="outline" onClick={resetFilters}>
							Сбросить
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Список</CardTitle>
						{isLoading && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="size-4 animate-spin" /> Обновление…
							</div>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{data.length === 0 ? (
						<div className="text-sm text-muted-foreground">Ничего не найдено. Попробуйте изменить фильтры.</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Название</TableHead>
										<TableHead>Статус</TableHead>
										<TableHead>Чат</TableHead>
										<TableHead>Создано</TableHead>
										<TableHead className="text-right">Действия</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.map(conn => (
										<TableRow
											key={conn.id}
											className="cursor-pointer hover:bg-muted/40"
											onClick={() => onRowClick(conn)}
										>
											<TableCell className="font-medium">{conn.name}</TableCell>
											<TableCell>{renderStatus(conn.status)}</TableCell>
											<TableCell className="truncate max-w-[260px] text-primary">{conn.chat_link || "—"}</TableCell>
											<TableCell>{formatDate(conn.created_at)}</TableCell>
											<TableCell className="text-right">
												<Button
													size="sm"
													variant="outline"
													onClick={e => {
														e.stopPropagation();
														onRowClick(conn);
													}}
												>
													Открыть
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Drawer просмотра/редактирования */}
			<HrConnectionDrawer open={drawerOpen} onOpenChange={v => !v && closeDrawer()} conn={selected} />

			{/* Создание нового контакта */}
			<HrConnectionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}

function formatDate(iso: string) {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

function renderStatus(s: HrStatus) {
	const map: Record<HrStatus, string> = {
		waiting_us: "Ждём нас",
		waiting_hr: "Ждём HR",
		rejected: "Отказ",
		offer: "Оффер",
	};
	return map[s] ?? s;
}
