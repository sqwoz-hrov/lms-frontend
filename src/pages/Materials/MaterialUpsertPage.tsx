// pages/Materials/UpsertMaterialPage.tsx — page wrapper (create/edit)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SubjectsApi, type SubjectResponseDto } from "@/api/subjectsApi";
import {
	MaterialsApi,
	type CreateMaterialDto,
	type UpdateMaterialDto,
	type MaterialResponseDto,
} from "@/api/materialsApi";
import { MaterialForm, type MaterialFormValues } from "@/components/materials/MaterialForm";
import { useRef } from "react";
import { useResumableVideoUpload } from "@/hooks/useResumableVideoUpload";

export function UpsertMaterialPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const { user, loading: userLoading } = useAuth();
	const isAdmin = !!user && (user as any).role === "admin";

	const params = useParams();
	const [sp] = useSearchParams();
	const defaultSubjectId = sp.get("subject_id") || "";

	const materialId = params.id; // routes: /materials/new  |  /materials/:id/edit
	const mode: "create" | "edit" = materialId ? "edit" : "create";

	// Pipe resumable upload progress into MaterialForm's setUploadProgress
	const setUploadProgressRef = useRef<(n: number) => void>(() => {});
	const { start: startUpload, status: uploadStatus } = useResumableVideoUpload({
		onProgress: ({ pct }) => setUploadProgressRef.current?.(pct),
	});

	// Subjects
	const {
		data: subjects,
		isLoading: subjectsLoading,
		isError: subjectsError,
		refetch: refetchSubjects,
	} = useQuery<SubjectResponseDto[]>({
		queryKey: ["subjects"],
		queryFn: SubjectsApi.list,
		staleTime: 60_000,
	});

	// Material (edit)
	const { data: material, isLoading: materialLoading } = useQuery<MaterialResponseDto | null>({
		queryKey: ["material", materialId],
		queryFn: async () => (materialId ? MaterialsApi.getById(materialId) : null),
		enabled: mode === "edit" && !!materialId,
		staleTime: 30_000,
	});

	const createMut = useMutation({
		mutationFn: MaterialsApi.create,
	});

	const updateMut = useMutation({
		mutationFn: MaterialsApi.update,
	});
	const openForTiersMut = useMutation({
		mutationFn: ({ id, tier_ids }: { id: string; tier_ids: string[] }) => MaterialsApi.openForTiers(id, { tier_ids }),
	});

	async function handleSubmit(
		values: MaterialFormValues,
		{ setUploadProgress }: { setUploadProgress: (n: number) => void },
	) {
		// wire the form's progress setter for the hook to call
		setUploadProgressRef.current = setUploadProgress;

		if (mode === "create") {
			const payload: CreateMaterialDto = {
				subject_id: values.subject_id.trim(),
				name: values.name.trim(),
				type: values.type,
			};

			if (values.type === "video") {
				const file = values.video_file?.[0];
				if (!file) throw new Error("Выберите видеофайл");
				// resumable upload → returns final VideoResponseDto on 201
				const v = await startUpload(file);
				payload.video_id = v.id;
			} else {
				payload.markdown_content = values.markdown_content?.trim() || undefined;
			}

			const created = await createMut.mutateAsync(payload);
			await openForTiersMut.mutateAsync({ id: created.id, tier_ids: values.subscription_tier_ids });
			await qc.invalidateQueries({ queryKey: ["materials"] });
			await qc.invalidateQueries({ queryKey: ["subjects"] });
			await qc.invalidateQueries({ queryKey: ["material", created.id] });
			const subject_id = created.subject_id || defaultSubjectId;
			navigate(`/materials${subject_id ? `?subject_id=${subject_id}` : ""}`);
			return;
		}

		// EDIT
		if (!material) throw new Error("Материал не найден");
		const payload: UpdateMaterialDto = {
			id: material.id,
			subject_id: values.subject_id.trim(),
			name: values.name.trim(),
			type: values.type,
		};

		if (values.type === "video") {
			const file = values.video_file?.[0];
			if (file) {
				const v = await startUpload(file);
				payload.video_id = v.id;
			}
			payload.markdown_content = undefined; // keep clean
		} else {
			payload.video_id = undefined;
			payload.markdown_content = values.markdown_content?.trim() || "";
		}

		const updated = await updateMut.mutateAsync(payload);
		await openForTiersMut.mutateAsync({ id: updated.id, tier_ids: values.subscription_tier_ids });
		await qc.invalidateQueries({ queryKey: ["materials"] });
		await qc.invalidateQueries({ queryKey: ["material", updated.id] });
		await qc.invalidateQueries({ queryKey: ["subjects"] });
		const subject_id = updated.subject_id || defaultSubjectId;
		navigate(`/materials${subject_id ? `?subject_id=${subject_id}` : ""}`);
	}

	if (userLoading || (mode === "edit" && materialLoading)) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}
	if (!isAdmin) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card>
					<CardContent className="py-10 text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Недостаточно прав. Только администратор может изменять материалы.
						</p>
						<Button variant="secondary" onClick={() => navigate(-1)}>
							Назад
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					{mode === "edit" ? "Редактирование материала" : "Новый материал"}
				</h1>
				<Button variant="outline" onClick={() => navigate("/subjects/new")}>
					Создать предмет
				</Button>
			</div>

			<Card className="max-w-3xl">
				<CardHeader>
					<CardTitle className="text-base">{mode === "edit" ? "Обновите поля" : "Заполните поля"}</CardTitle>
				</CardHeader>
				<CardContent>
					{subjectsLoading || subjectsError ? (
						<div className="space-y-3">
							{subjectsLoading && <div className="text-sm text-muted-foreground">Загрузка предметов…</div>}
							{subjectsError && (
								<div className="flex items-center gap-3">
									<span className="text-sm text-red-600">Не удалось загрузить список предметов.</span>
									<Button size="sm" variant="secondary" onClick={() => refetchSubjects()}>
										Повторить
									</Button>
								</div>
							)}
						</div>
					) : (
						<MaterialForm
							mode={mode}
							subjects={subjects || []}
							defaultSubjectId={defaultSubjectId}
							initial={material ?? null}
							submitting={
								createMut.isPending ||
								updateMut.isPending ||
								openForTiersMut.isPending ||
								uploadStatus === "uploading" ||
								uploadStatus === "paused"
							}
							onSubmit={handleSubmit}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
