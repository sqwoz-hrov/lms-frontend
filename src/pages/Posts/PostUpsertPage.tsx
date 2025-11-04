// pages/Posts/PostUpsertPage.tsx — admin-only create/edit
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminOnlyPage } from "@/components/admin/AdminOnlyPage";
import { AdminUpsertLayout } from "@/components/admin/AdminUpsertLayout";
import { PostForm, type PostFormValues } from "@/components/posts/PostForm";
import { PostsApi, type CreatePostDto, type PostResponseDto, type UpdatePostDto } from "@/api/postsApi";
import { useResumableVideoUpload } from "@/hooks/useResumableVideoUpload";

export function PostUpsertPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const params = useParams<{ id?: string }>();
	const postId = params.id;
	const mode: "create" | "edit" = postId ? "edit" : "create";

	const setUploadProgressRef = useRef<(n: number) => void>(() => {});
	const { start: startUpload, status: uploadStatus } = useResumableVideoUpload({
		onProgress: ({ pct }) => setUploadProgressRef.current?.(pct),
	});

	const {
		data: post,
		isLoading: postLoading,
		isError: postError,
	} = useQuery<PostResponseDto | null>({
		queryKey: ["post", postId],
		queryFn: async () => (postId ? PostsApi.getById(postId) : null),
		enabled: mode === "edit" && !!postId,
		staleTime: 30_000,
	});

	const createMut = useMutation({
		mutationFn: PostsApi.create,
	});

	const updateMut = useMutation({
		mutationFn: PostsApi.update,
	});
	const openForTiersMut = useMutation({
		mutationFn: ({ id, tier_ids }: { id: string; tier_ids: string[] }) => PostsApi.openForTiers(id, { tier_ids }),
	});

	async function handleSubmit(values: PostFormValues, helpers: { setUploadProgress: (n: number) => void }) {
		setUploadProgressRef.current = helpers.setUploadProgress;

		if (mode === "create") {
			const payload: CreatePostDto = {
				title: values.title.trim(),
				markdown_content: values.markdown_content.trim(),
			};

			const file = values.video_file?.[0];
			if (file) {
				const uploaded = await startUpload(file);
				payload.video_id = uploaded.id;
			}

			const created = await createMut.mutateAsync(payload);
			await openForTiersMut.mutateAsync({ id: created.id, tier_ids: values.subscription_tier_ids });
			await queryClient.invalidateQueries({ queryKey: ["posts"] });
			await queryClient.invalidateQueries({ queryKey: ["post", created.id] });
			navigate(-1);
			return;
		}

		if (!post) {
			throw new Error("Пост не найден");
		}

		const payload: UpdatePostDto = {
			id: post.id,
			title: values.title.trim(),
			markdown_content: values.markdown_content.trim(),
		};

		const file = values.video_file?.[0];
		if (file) {
			const uploaded = await startUpload(file);
			payload.video_id = uploaded.id;
		}

		const updated = await updateMut.mutateAsync(payload);
		await openForTiersMut.mutateAsync({ id: updated.id, tier_ids: values.subscription_tier_ids });
		await queryClient.invalidateQueries({ queryKey: ["posts"] });
		await queryClient.invalidateQueries({ queryKey: ["post", updated.id] });
		navigate(-1);
	}

	const ready = mode === "edit" ? !postLoading : true;

	return (
		<AdminOnlyPage
			ready={ready}
			deniedMessage="Недостаточно прав. Только администратор может управлять постами."
			onBack={() => navigate(-1)}
		>
			{mode === "edit" && !postLoading && (postError || !post) ? (
				<div className="container mx-auto px-4 py-10">
					<Card className="max-w-2xl">
						<CardHeader>
							<CardTitle className="text-base">Не удалось загрузить пост</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm text-muted-foreground">
							<p>Проверьте ссылку и попробуйте еще раз.</p>
							<Button variant="secondary" onClick={() => navigate(-1)}>
								Назад
							</Button>
						</CardContent>
					</Card>
				</div>
			) : (
				<AdminUpsertLayout
					mode={mode}
					title={{ create: "Новый пост", edit: "Редактирование поста" }}
					cardTitle={{ create: "Заполните поля", edit: "Обновите данные" }}
				>
					<PostForm
						mode={mode}
						initial={post ?? null}
						submitting={
							createMut.isPending ||
							updateMut.isPending ||
							openForTiersMut.isPending ||
							uploadStatus === "uploading" ||
							uploadStatus === "paused"
						}
						onSubmit={handleSubmit}
						onCancel={() => navigate(-1)}
					/>
				</AdminUpsertLayout>
			)}
		</AdminOnlyPage>
	);
}
