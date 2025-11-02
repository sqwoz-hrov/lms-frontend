import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { PaymentsApi, type CreatePaymentFormDto, type CreatePaymentFormResponseDto } from "@/api/paymentsApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { SubscriptionTierCard } from "@/components/subscriptions/SubscriptionTierCard";

export function SubscriptionPage() {
	const { user, userLoading } = useAuth();
	const [upgradeError, setUpgradeError] = useState<string | null>(null);
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

	const createPaymentFormMutation = useMutation<CreatePaymentFormResponseDto, unknown, CreatePaymentFormDto>({
		mutationFn: PaymentsApi.createForm,
		onMutate: () => {
			setUpgradeError(null);
		},
		onSuccess: data => {
			if (data?.confirmation_url) {
				window.location.assign(data.confirmation_url);
				return;
			}
			setUpgradeError("Не удалось получить ссылку на оплату. Попробуйте снова.");
		},
		onError: () => {
			setUpgradeError("Не удалось создать форму оплаты. Попробуйте позже.");
		},
	});

	if (userLoading) {
		return (
			<div className="flex min-h-[200px] items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (user.role !== "subscriber") {
		return <Navigate to="/materials" replace />;
	}

	const currentTierId =
		typeof user.subscription_tier_id === "string" ? user.subscription_tier_id : (user.subscription_tier?.id ?? null);

	const sortedTiers = useMemo(() => {
		if (!tiers) return [];
		return [...tiers].sort((a, b) => a.price_rubles - b.price_rubles);
	}, [tiers]);

	async function handleUpgrade(tierId: string) {
		if (createPaymentFormMutation.isPending) return;
		try {
			await createPaymentFormMutation.mutateAsync({ subscription_tier_id: tierId });
		} catch {
			// onError handler already updates the UI
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold">Подписка</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Выберите подходящий тариф и узнайте, какие возможности открываются на каждом уровне.
				</p>
			</div>

			{upgradeError && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
					{upgradeError}
				</div>
			)}

			{isLoading && (
				<div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			)}

			{isError && (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
					<p className="text-destructive">Не удалось загрузить уровни подписки.</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						<RefreshCcw className="mr-2 h-4 w-4" />
						Повторить
					</Button>
				</div>
			)}

			{!isLoading && !isError && sortedTiers.length === 0 && (
				<div className="rounded-lg border p-6 text-sm text-muted-foreground">
					Пока нет доступных уровней подписки. Загляните позже.
				</div>
			)}

			{sortedTiers.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2">
					{sortedTiers.map(tier => {
						const isCurrent = tier.id === currentTierId;
						const isProcessing =
							createPaymentFormMutation.isPending &&
							createPaymentFormMutation.variables?.subscription_tier_id === tier.id;
						const footer = (
							<Button
								variant={isCurrent ? "secondary" : "default"}
								disabled={isCurrent || isProcessing}
								onClick={() => {
									if (!isCurrent) {
										void handleUpgrade(tier.id);
									}
								}}
							>
								{isCurrent ? (
									"Это ваш тариф"
								) : isProcessing ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Создание формы…
									</>
								) : (
									"Улучшить"
								)}
							</Button>
						);

						return <SubscriptionTierCard key={tier.id} tier={tier} isCurrent={isCurrent} footer={footer} />;
					})}
				</div>
			)}
		</div>
	);
}
