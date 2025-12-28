// pages/Materials/UpsertMaterialPage.tsx — page wrapper (create/edit)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { AdminOnlyPage } from "@/components/admin/AdminOnlyPage";
import { AdminUpsertLayout } from "@/components/admin/AdminUpsertLayout";

export function UpsertMaterialPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();

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
		const markdown = (values.markdown_content || "").trim();
		const file = values.video_file?.[0];

		if (mode === "create") {
			if (!markdown && !file) {
				throw new Error("Добавьте видео или markdown содержимое");
			}

			const payload: CreateMaterialDto = {
				subject_id: values.subject_id.trim(),
				name: values.name.trim(),
			};

			if (markdown) {
				payload.markdown_content = markdown;
			}

			if (file) {
				// resumable upload → returns final VideoResponseDto on 201
				const v = await startUpload(file);
				payload.video_id = v.id;
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
		};

		let hasVideoAfter = !!material.video_id;
		const markdownAfter = markdown;

		if (file) {
			const v = await startUpload(file);
			payload.video_id = v.id;
			hasVideoAfter = true;
		}
		payload.markdown_content = markdownAfter;

		if (!hasVideoAfter && !markdownAfter) {
			throw new Error("Добавьте видео или markdown содержимое");
		}

		const updated = await updateMut.mutateAsync(payload);
		await openForTiersMut.mutateAsync({ id: updated.id, tier_ids: values.subscription_tier_ids });
		await qc.invalidateQueries({ queryKey: ["materials"] });
		await qc.invalidateQueries({ queryKey: ["material", updated.id] });
		await qc.invalidateQueries({ queryKey: ["subjects"] });
		const subject_id = updated.subject_id || defaultSubjectId;
		navigate(`/materials${subject_id ? `?subject_id=${subject_id}` : ""}`);
	}

	const ready = mode === "edit" ? !materialLoading : true;

	return (
		<AdminOnlyPage
			ready={ready}
			deniedMessage="Недостаточно прав. Только администратор может изменять материалы."
			onBack={() => navigate(-1)}
		>
			<AdminUpsertLayout
				mode={mode}
				title={{ create: "Новый материал", edit: "Редактирование материала" }}
				actionSlot={
					<Button variant="outline" onClick={() => navigate("/subjects/new")}>
						Создать предмет
					</Button>
				}
			>
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
			</AdminUpsertLayout>
		</AdminOnlyPage>
	);
}
