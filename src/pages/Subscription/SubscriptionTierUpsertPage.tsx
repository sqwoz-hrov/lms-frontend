import {
	SubscriptionTiersApi,
	type CreateSubscriptionTierDto,
	type SubscriptionTierResponseDto,
	type UpdateSubscriptionTierDto,
} from "@/api/subscriptionTiersApi";
import { AdminUpsertLayout } from "@/components/admin/AdminUpsertLayout";
import { SubscriptionTierForm, type SubscriptionTierFormValues } from "@/components/subscriptions/SubscriptionTierForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

const SUBSCRIPTION_TIERS_ADMIN_PATH = "/admin/subscription-tiers";

export function SubscriptionTierUpsertPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

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
			markdown_description: values.markdown_description,
		};

		if (mode === "create") {
			const data: CreateSubscriptionTierDto = payload;
			await createMut.mutateAsync(data);
			await queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
			navigate(SUBSCRIPTION_TIERS_ADMIN_PATH);
			return;
		}

		if (!tier) {
			throw new Error("Тариф не найден");
		}

		const data: UpdateSubscriptionTierDto = {
			id: tier.id,
			...payload,
		};

		await updateMut.mutateAsync(data);
		await queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
		await queryClient.invalidateQueries({ queryKey: ["subscription-tier", tier.id] });
		navigate(SUBSCRIPTION_TIERS_ADMIN_PATH);
	}

	if (mode === "edit" && tierLoading) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Загрузка…</div>;
	}

	if (mode === "edit" && !tierLoading && (tierError || !tier)) {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card className="max-w-2xl">
					<CardHeader>
						<CardTitle className="text-base">Не удалось загрузить тариф</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>Проверьте ссылку и попробуйте еще раз.</p>
						<Button variant="secondary" onClick={() => navigate(SUBSCRIPTION_TIERS_ADMIN_PATH)}>
							К списку тарифов
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const submitting = createMut.isPending || updateMut.isPending;

	return (
		<AdminUpsertLayout
			mode={mode}
			title={{ create: "Новый тариф подписки", edit: "Редактирование тарифа" }}
			maxWidthClassName="max-w-3xl"
		>
			<SubscriptionTierForm
				mode={mode}
				initial={tier ?? null}
				submitting={submitting}
				onSubmit={handleSubmit}
				onCancel={() => navigate(-1)}
			/>
		</AdminUpsertLayout>
	);
}
