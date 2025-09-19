import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { SubjectsApi, type SubjectResponseDto } from "@/api/subjectsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function ListSubjectsPage() {
	const navigate = useNavigate();

	// Subjects
	const {
		data: subjects,
		isLoading: subjectsLoading,
		isError: subjectsError,
		refetch,
	} = useQuery<SubjectResponseDto[]>({
		queryKey: ["subjects"],
		queryFn: SubjectsApi.list,
		staleTime: 60_000,
	});

	// Current user (to check role)
	const { data: user, isLoading: userLoading } = useCurrentUser();
	const isAdmin = !!user && (user as any).role === "admin"; // adjust typing if you have User type

	const handleAdd = () => navigate("/subjects/new");
	const handleOpen = (s: SubjectResponseDto) => navigate(`/materials?subject_id=${s.id}`);

	if (subjectsLoading || userLoading) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}

	if (subjectsError) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
				<p className="text-sm text-red-600">Не удалось загрузить список предметов.</p>
				<Button onClick={() => refetch()}>Повторить</Button>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">Предметы</h1>
				{isAdmin && <Button onClick={handleAdd}>Добавить тему</Button>}
			</div>

			{!subjects || subjects.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="py-10 flex flex-col items-center justify-center gap-4">
						<p className="text-sm text-muted-foreground">Пока нет ни одного предмета.</p>
						{isAdmin && <Button onClick={handleAdd}>Добавить тему</Button>}
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{subjects.map(s => (
						<Card key={s.id} className="transition hover:shadow-md" role="button" onClick={() => handleOpen(s)}>
							<CardHeader className="flex flex-row items-center gap-3">
								<div
									className="h-8 w-8 rounded-full ring-1 ring-black/5"
									style={{ backgroundColor: s.color_code }}
									aria-label={`Цвет ${s.color_code}`}
								/>
								<CardTitle className="text-base font-medium line-clamp-1">{s.name}</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="flex items-center justify-between">
									<span className="text-xs text-muted-foreground">Нажмите чтобы открыть</span>
									<Button
										size="sm"
										variant="secondary"
										onClick={e => {
											e.stopPropagation();
											handleOpen(s);
										}}
									>
										Открыть
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
