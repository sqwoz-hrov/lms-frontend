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
import { uploadVideo } from "@/api/videosApi";
import { MaterialForm, type MaterialFormValues } from "@/components/materials/MaterialForm";

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
		onSuccess: async created => {
			await qc.invalidateQueries({ queryKey: ["materials"] });
			await qc.invalidateQueries({ queryKey: ["subjects"] });
			const subject_id = created.subject_id || defaultSubjectId;
			navigate(`/materials${subject_id ? `?subject_id=${subject_id}` : ""}`);
		},
	});

	const updateMut = useMutation({
		mutationFn: MaterialsApi.update,
		onSuccess: async updated => {
			await qc.invalidateQueries({ queryKey: ["materials"] });
			await qc.invalidateQueries({ queryKey: ["material", updated.id] });
			await qc.invalidateQueries({ queryKey: ["subjects"] });
			const subject_id = updated.subject_id || defaultSubjectId;
			navigate(`/materials${subject_id ? `?subject_id=${subject_id}` : ""}`);
		},
	});

	async function handleSubmit(
		values: MaterialFormValues,
		{ setUploadProgress }: { setUploadProgress: (n: number) => void },
	) {
		if (mode === "create") {
			const payload: CreateMaterialDto = {
				subject_id: values.subject_id.trim(),
				name: values.name.trim(),
				type: values.type,
			};

			if (values.type === "video") {
				const file = values.video_file?.[0];
				if (!file) throw new Error("Выберите видеофайл");
				const videoUpload = await uploadVideo(file, {
					onUploadProgress: (e: any) => {
						if (!e.total) return;
						setUploadProgress(Math.round((e.loaded / e.total) * 100));
					},
				});
				payload.video_id = videoUpload.id;
			} else {
				payload.markdown_content = values.markdown_content?.trim() || undefined;
			}

			await createMut.mutateAsync(payload);
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
				const videoUpload = await uploadVideo(file, {
					onUploadProgress: (e: any) => {
						if (!e.total) return;
						setUploadProgress(Math.round((e.loaded / e.total) * 100));
					},
				});
				payload.video_id = videoUpload.id;
			}
			payload.markdown_content = undefined; // keep clean
		} else {
			payload.video_id = undefined;
			payload.markdown_content = values.markdown_content?.trim() || "";
		}

		await updateMut.mutateAsync(payload);
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
							submitting={createMut.isPending || updateMut.isPending}
							onSubmit={handleSubmit}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
