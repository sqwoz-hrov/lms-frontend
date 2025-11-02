import { SubjectsApi, type CreateSubjectDto, type SubjectResponseDto, type UpdateSubjectDto } from "@/api/subjectsApi";
import { SubjectForm, type SubjectFormValues } from "@/components/subjects/SubjectForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

function normalizeHex(value: string) {
	const v = value.startsWith("#") ? value.slice(1) : value;
	return `#${v.toUpperCase()}`;
}

export function SubjectUpsertPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, loading: userLoading } = useAuth();
	const isAdmin = !!user && (user as any).role === "admin";

	const params = useParams<{ id?: string }>();
	const subjectId = params.id;
	const mode: "create" | "edit" = subjectId ? "edit" : "create";

	const {
		data: subject,
		isLoading: subjectLoading,
		isError: subjectError,
	} = useQuery<SubjectResponseDto | null>({
		queryKey: ["subject", subjectId],
		queryFn: async () => (subjectId ? SubjectsApi.getById(subjectId) : null),
		enabled: mode === "edit" && !!subjectId,
		staleTime: 30_000,
	});

	const createMut = useMutation({ mutationFn: SubjectsApi.create });
	const updateMut = useMutation({ mutationFn: SubjectsApi.update });
	const openForTiersMut = useMutation({
		mutationFn: ({ id, tier_ids }: { id: string; tier_ids: string[] }) => SubjectsApi.openForTiers(id, { tier_ids }),
	});

	async function handleSubmit(values: SubjectFormValues) {
		const payload = {
			name: values.name.trim(),
			color_code: normalizeHex(values.color_code),
		};

		if (mode === "create") {
			const data: CreateSubjectDto = payload;
			const created = await createMut.mutateAsync(data);
			await openForTiersMut.mutateAsync({ id: created.id, tier_ids: values.subscription_tier_ids });
			await queryClient.invalidateQueries({ queryKey: ["subjects"] });
			await queryClient.invalidateQueries({ queryKey: ["subject", created.id] });
			navigate("/subjects");
			return;
		}

		if (!subject) {
			throw new Error("Предмет не найден");
		}

		const data: UpdateSubjectDto = {
			id: subject.id,
			name: payload.name,
			color_code: payload.color_code,
		};

		const updated = await updateMut.mutateAsync(data);
		await openForTiersMut.mutateAsync({ id: updated.id, tier_ids: values.subscription_tier_ids });
		await queryClient.invalidateQueries({ queryKey: ["subjects"] });
		await queryClient.invalidateQueries({ queryKey: ["subject", updated.id] });
		navigate("/subjects");
	}

	if (userLoading || (mode === "edit" && subjectLoading)) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}

	if (!isAdmin) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card>
					<CardContent className="py-10 text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Недостаточно прав. Только администратор может управлять предметами.
						</p>
						<Button variant="secondary" onClick={() => navigate(-1)}>
							Назад
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (mode === "edit" && !subjectLoading && (subjectError || !subject)) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card className="max-w-2xl">
					<CardHeader>
						<CardTitle className="text-base">Не удалось загрузить предмет</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>Проверьте ссылку и попробуйте еще раз.</p>
						<Button variant="secondary" onClick={() => navigate("/subjects")}>
							К списку предметов
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const submitting = createMut.isPending || updateMut.isPending || openForTiersMut.isPending;

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					{mode === "edit" ? "Редактирование предмета" : "Новый предмет"}
				</h1>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle className="text-base">{mode === "edit" ? "Обновите поля" : "Заполните поля"}</CardTitle>
				</CardHeader>
				<CardContent>
					<SubjectForm
						mode={mode}
						initial={subject ?? null}
						submitting={submitting}
						onSubmit={handleSubmit}
						onCancel={() => navigate(-1)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
