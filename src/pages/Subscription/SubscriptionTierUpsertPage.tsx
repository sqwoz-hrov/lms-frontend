import {
	SubscriptionTiersApi,
	type CreateSubscriptionTierDto,
	type SubscriptionTierResponseDto,
	type UpdateSubscriptionTierDto,
} from "@/api/subscriptionTiersApi";
import { SubscriptionTierForm, type SubscriptionTierFormValues } from "@/components/subscriptions/SubscriptionTierForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

export function SubscriptionTierUpsertPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, loading: userLoading } = useAuth();
	const isAdmin = user?.role === "admin";

	const params = useParams<{ id?: string }>();
	const tierId = params.id;
	const mode: "create" | "edit" = tierId ? "edit" : "create";

	const {
		data: tier,
		isLoading: tierLoading,
		isError: tierError,
	} = useQuery<SubscriptionTierResponseDto | null>({
		queryKey: ["subscription-tier", tierId],
		queryFn: async () => (tierId ? SubscriptionTiersApi.getById(tierId) : null),
		enabled: mode === "edit" && !!tierId,
		staleTime: 30_000,
	});

	const createMut = useMutation({ mutationFn: SubscriptionTiersApi.create });
	const updateMut = useMutation({ mutationFn: SubscriptionTiersApi.update });

	async function handleSubmit(values: SubscriptionTierFormValues) {
		const payload = {
			tier: values.tier,
			price_rubles: values.price_rubles,
			power: values.power,
			permissions: values.permissions,
		};

		if (mode === "create") {
			const data: CreateSubscriptionTierDto = payload;
			await createMut.mutateAsync(data);
			await queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
			navigate("/subscription-tiers");
			return;
		}

		if (!tier) {
			throw new Error("Подписка не найдена");
		}

		const data: UpdateSubscriptionTierDto = {
			id: tier.id,
			...payload,
		};

		await updateMut.mutateAsync(data);
		await queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
		await queryClient.invalidateQueries({ queryKey: ["subscription-tier", tier.id] });
		navigate("/subscription-tiers");
	}

	if (userLoading || (mode === "edit" && tierLoading)) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}

	if (!isAdmin) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card>
					<CardContent className="py-10 text-center space-y-4">
						<p className="text-sm text-muted-foreground">
							Недостаточно прав. Только администратор может управлять подписками.
						</p>
						<Button variant="secondary" onClick={() => navigate(-1)}>
							Назад
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (mode === "edit" && !tierLoading && (tierError || !tier)) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card className="max-w-2xl">
					<CardHeader>
						<CardTitle className="text-base">Не удалось загрузить подписку</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>Проверьте ссылку и попробуйте еще раз.</p>
						<Button variant="secondary" onClick={() => navigate("/subscription-tiers")}>
							К списку подписок
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const submitting = createMut.isPending || updateMut.isPending;

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					{mode === "edit" ? "Редактирование подписки" : "Новая подписка"}
				</h1>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle className="text-base">{mode === "edit" ? "Обновите поля" : "Заполните поля"}</CardTitle>
				</CardHeader>
				<CardContent>
					<SubscriptionTierForm
						mode={mode}
						initial={tier ?? null}
						submitting={submitting}
						onSubmit={handleSubmit}
						onCancel={() => navigate(-1)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
