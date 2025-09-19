import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialsApi, type MaterialResponseDto } from "@/api/materialsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MoreVertical, FileText, Video, FileQuestion } from "lucide-react";

export function ListMaterialsPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [params, setParams] = useSearchParams();

	// filters
	const subjectId = params.get("subject_id") || undefined;
	const tabFromUrl = (params.get("tab") as FilterTab | null) || "active";
	const [tab, setTab] = useState<FilterTab>(tabFromUrl);

	// keep URL in sync
	useEffect(() => {
		const next = new URLSearchParams(params);
		next.set("tab", tab);
		if (subjectId) next.set("subject_id", subjectId);
		else next.delete("subject_id");
		setParams(next, { replace: true });
	}, [tab]);

	const { data: user } = useCurrentUser();
	const isAdmin = !!user && (user as any).role === "admin";

	// Build query params for API
	const listParams = useMemo(() => {
		return {
			subject_id: subjectId,
			is_archived: tab === "archived" ? true : tab === "active" ? false : undefined,
		} as { subject_user_id?: string; subject_id?: string; is_archived?: boolean };
	}, [subjectId, tab]);

	const {
		data: materials,
		isLoading,
		isError,
		refetch,
	} = useQuery<MaterialResponseDto[]>({
		queryKey: ["materials", listParams],
		queryFn: () => MaterialsApi.list(listParams),
		staleTime: 60_000,
	});

	// Archive/Unarchive
	const archiveMut = useMutation({
		mutationFn: MaterialsApi.archive,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["materials"] });
		},
	});

	function typeBadge(t: MaterialResponseDto["type"]) {
		switch (t) {
			case "article":
				return (
					<Badge variant="secondary" className="gap-1">
						<FileText className="h-3.5 w-3.5" /> Статья
					</Badge>
				);
			case "video":
				return (
					<Badge variant="secondary" className="gap-1">
						<Video className="h-3.5 w-3.5" /> Видео
					</Badge>
				);
			default:
				return (
					<Badge variant="secondary" className="gap-1">
						<FileQuestion className="h-3.5 w-3.5" /> Другое
					</Badge>
				);
		}
	}

	const onOpen = (m: MaterialResponseDto) => navigate(`/materials/${m.id}`);
	const onEdit = (m: MaterialResponseDto) => navigate(`/materials/${m.id}/edit`);
	const onArchiveToggle = async (m: MaterialResponseDto) => {
		const action = m.is_archived ? "разархивировать" : "архивировать";
		const ok = window.confirm(`Вы действительно хотите ${action} «${m.name}»?`);
		if (!ok) return;
		await archiveMut.mutateAsync({ id: m.id, is_archived: !m.is_archived });
	};

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">Материалы</h1>
					{subjectId && (
						<Badge variant="outline" title="Фильтр по предмету">
							subject_id: {subjectId}
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-2">
					<Segmented value={tab} onChange={setTab} />
					{isAdmin && (
						<Button onClick={() => navigate(`/materials/new${subjectId ? `?subject_id=${subjectId}` : ""}`)}>
							Добавить материал
						</Button>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="min-h-[40vh] grid place-items-center text-muted-foreground">Загрузка…</div>
			) : isError ? (
				<div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
					<p className="text-sm text-red-600">Не удалось загрузить материалы.</p>
					<Button onClick={() => refetch()}>Повторить</Button>
				</div>
			) : !materials || materials.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-sm text-muted-foreground">Материалы не найдены.</p>
						{isAdmin && (
							<Button onClick={() => navigate(`/materials/new${subjectId ? `?subject_id=${subjectId}` : ""}`)}>
								Создать материал
							</Button>
						)}
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{materials.map(m => (
						<Card
							key={m.id}
							className={`transition hover:shadow-md ${m.is_archived ? "opacity-75" : ""}`}
							role="button"
							onClick={() => onOpen(m)}
						>
							<CardHeader className="flex flex-row items-start justify-between gap-2">
								<CardTitle className="text-base font-medium line-clamp-2 pr-2">{m.name}</CardTitle>

								{isAdmin && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
											<DropdownMenuItem onClick={() => onEdit(m)}>Редактировать</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={() => onArchiveToggle(m)}>
												{m.is_archived ? "Разархивировать" : "Архивировать"}
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</CardHeader>
							<CardContent className="pt-0">
								<div className="flex items-center justify-between">
									{typeBadge(m.type)}
									{m.is_archived && <Badge variant="outline">Архив</Badge>}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

// ——— Helpers ———

type FilterTab = "all" | "active" | "archived";

function Segmented({ value, onChange }: { value: FilterTab; onChange: (v: FilterTab) => void }) {
	const options: { key: FilterTab; label: string }[] = [
		{ key: "active", label: "Активные" },
		{ key: "archived", label: "Архив" },
		{ key: "all", label: "Все" },
	];
	return (
		<div className="inline-flex rounded-xl border bg-background p-1 text-sm">
			{options.map(o => (
				<button
					key={o.key}
					type="button"
					onClick={() => onChange(o.key)}
					className={`px-3 py-1.5 rounded-lg transition ${
						value === o.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}
