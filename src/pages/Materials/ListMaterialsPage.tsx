import { MaterialsApi, type MaterialResponseDto } from "@/api/materialsApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { SubjectsApi, type SubjectResponseDto } from "@/api/subjectsApi";

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

	const { user } = useAuth();
	const isAdmin = !!user && (user as any).role === "admin";

	useEffect(() => {
		if (!isAdmin && tab !== "active") {
			setTab("active");
		}
	}, [isAdmin, tab]);

	const {
		data: subject,
		isLoading: isSubjectLoading,
		isError: isSubjectError,
	} = useQuery<SubjectResponseDto | null>({
		queryKey: ["subject", subjectId],
		enabled: !!subjectId,
		queryFn: () => SubjectsApi.getById(subjectId!),
		staleTime: 60_000,
		retry: 1,
	});

	const {
		data: subjects,
		isLoading: subjectsLoading,
		isError: subjectsError,
	} = useQuery<SubjectResponseDto[]>({
		queryKey: ["subjects"],
		queryFn: SubjectsApi.list,
		staleTime: 5 * 60_000,
	});

	const subjectsById = useMemo<Record<string, SubjectResponseDto>>(() => {
		if (!subjects) return {} as Record<string, SubjectResponseDto>;
		return subjects.reduce<Record<string, SubjectResponseDto>>((acc, subj) => {
			acc[subj.id] = subj;
			return acc;
		}, {});
	}, [subjects]);

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
						<>
							{isSubjectLoading ? (
								<Badge variant="outline" title="Загрузка темы">
									Загрузка темы…
								</Badge>
							) : isSubjectError ? (
								<Badge variant="destructive" title="Тема не найдена">
									Тема не найдена
								</Badge>
							) : subject ? (
								<Badge variant="outline" title="Фильтр по теме">
									<span className="h-3 w-3 rounded-full border" style={{ backgroundColor: subject.color_code }} />
									{subject.name}
								</Badge>
							) : (
								<Badge variant="outline">subject_id: {subjectId}</Badge>
							)}
							<Button
								variant="ghost"
								size="sm"
								className="ml-1"
								onClick={() => {
									const next = new URLSearchParams(params);
									next.delete("subject_id");
									setParams(next, { replace: true });
								}}
								title="Сбросить фильтр по теме"
							>
								Сбросить
							</Button>
						</>
					)}
				</div>

				<div className="flex items-center gap-2">
					{isAdmin && <Segmented value={tab} onChange={setTab} />}
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
					{materials.map(m => {
						const subjectMeta = m.subject_id ? subjectsById[m.subject_id] : undefined;
						return (
							<Card
								key={m.id}
								className={`transition hover:shadow-md ${m.is_archived ? "opacity-75" : ""}`}
								role="button"
								onClick={() => onOpen(m)}
							>
								<CardHeader className="flex flex-row items-start justify-between gap-2">
									<div className="flex flex-1 flex-col gap-1 pr-2">
										<CardTitle className="text-base font-medium leading-snug line-clamp-2">{m.name}</CardTitle>
										{m.subject_id && (
											<div className="min-h-[24px]">
												{subjectsLoading ? (
													<Badge variant="outline" className="text-xs font-normal text-muted-foreground">
														Загрузка предмета…
													</Badge>
												) : subjectMeta ? (
													<Badge variant="outline" className="w-fit gap-1 text-xs font-normal">
														<span
															className="h-2.5 w-2.5 rounded-full border"
															aria-hidden="true"
															style={{ backgroundColor: subjectMeta.color_code }}
														/>
														{subjectMeta.name}
													</Badge>
												) : subjectsError ? (
													<Badge variant="destructive" className="text-xs font-normal">
														Ошибка загрузки предмета
													</Badge>
												) : (
													<Badge variant="secondary" className="text-xs font-normal">
														Предмет не найден
													</Badge>
												)}
											</div>
										)}
									</div>

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
								{m.is_archived && (
									<CardContent className="pt-0">
										<Badge variant="outline">Архив</Badge>
									</CardContent>
								)}
							</Card>
						);
					})}
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
