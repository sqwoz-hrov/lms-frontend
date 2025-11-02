import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { SubscriptionTierCard } from "@/components/subscriptions/SubscriptionTierCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";

export function ListSubscriptionTiersPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [removingId, setRemovingId] = useState<string | null>(null);

	const {
		data: tiers,
		isError,
		isLoading,
		refetch,
	} = useQuery<SubscriptionTierResponseDto[]>({
		queryKey: ["subscription-tiers"],
		queryFn: SubscriptionTiersApi.list,
		staleTime: 60_000,
	});

	const deleteMut = useMutation({
		mutationFn: SubscriptionTiersApi.delete,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
		},
		onSettled: () => {
			setRemovingId(null);
		},
		onError: () => {
			setRemovingId(null);
		},
	});

	const sortedTiers = useMemo(() => {
		if (!tiers) return [];
		return [...tiers].sort((a, b) => a.price_rubles - b.price_rubles);
	}, [tiers]);

	function handleCreate() {
		navigate("/subscription-tiers/new");
	}

	function handleEdit(id: string) {
		navigate(`/subscription-tiers/${id}/edit`);
	}

	async function handleDelete(id: string) {
		if (deleteMut.isPending) return;
		const confirmed = window.confirm("Удалить подписку? Это действие нельзя отменить.");
		if (!confirmed) return;
		setRemovingId(id);
		await deleteMut.mutateAsync({ id }).catch(() => {
			/* ошибка обработана через onError */
		});
	}

	if (isLoading) {
		return (
			<div className="min-h-[60vh] grid place-items-center text-muted-foreground">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
				<p>Не удалось загрузить подписки.</p>
				<Button onClick={() => refetch()}>
					<RefreshCcw className="mr-2 h-4 w-4" />
					Повторить
				</Button>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">Подписки</h1>
				<Button onClick={handleCreate}>
					<Plus className="mr-2 h-4 w-4" />
					Новая подписка
				</Button>
			</div>

			{deleteMut.isError && (
				<div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
					Не удалось удалить подписку. Попробуйте снова.
				</div>
			)}

			{sortedTiers.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="py-10 flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
						<p>Пока нет ни одной подписки.</p>
						<Button onClick={handleCreate}>
							<Plus className="mr-2 h-4 w-4" />
							Создать
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{sortedTiers.map(tier => {
						const deleting = removingId === tier.id && deleteMut.isPending;
						const footer = (
							<div className="flex w-full items-center justify-end gap-2">
								<Button variant="outline" size="sm" onClick={() => handleEdit(tier.id)} disabled={deleting}>
									Редактировать
								</Button>
								<Button variant="destructive" size="sm" onClick={() => handleDelete(tier.id)} disabled={deleting}>
									{deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
									Удалить
								</Button>
							</div>
						);

						return <SubscriptionTierCard key={tier.id} tier={tier} footer={footer} />;
					})}
				</div>
			)}
		</div>
	);
}
