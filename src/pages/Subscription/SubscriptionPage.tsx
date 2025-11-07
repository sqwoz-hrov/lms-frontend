import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import {
	PaymentsApi,
	type CreatePaymentFormDto,
	type CreatePaymentFormResponseDto,
	type SubscriptionPaymentMethodResponseDto,
	type YookassaPaymentMethodType,
} from "@/api/paymentsApi";
import { SubscriptionsApi, type DowngradeSubscriptionDto, type SubscriptionResponseDto } from "@/api/subscriptionsApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import { SubscriptionTierCard } from "@/components/subscriptions/SubscriptionTierCard";

const paymentMethodTypeLabels: Record<YookassaPaymentMethodType, string> = {
	bank_card: "Банковская карта",
	yoo_money: "ЮMoney",
	electronic_certificate: "Электронный сертификат",
	sberbank: "Сбербанк Онлайн",
	tinkoff_bank: "Tinkoff Bank",
	sbp: "СБП",
	sber_loan: "Сбер Рассрочка",
	sber_bnpl: "Сбер BNPL",
	b2b_sberbank: "Сбербанк Бизнес Онлайн",
	mobile_balance: "Баланс телефона",
	cash: "Наличные",
};

export function SubscriptionPage() {
	const { user, userLoading, checkAuth } = useAuth();
	const [subscriptionActionError, setSubscriptionActionError] = useState<string | null>(null);
	const [paymentMethodActionError, setPaymentMethodActionError] = useState<string | null>(null);
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
			setSubscriptionActionError(null);
		},
		onSuccess: data => {
			if (data?.confirmation_url) {
				window.location.assign(data.confirmation_url);
				return;
			}
			setSubscriptionActionError("Не удалось получить ссылку на оплату. Попробуйте снова.");
		},
		onError: () => {
			setSubscriptionActionError("Не удалось создать форму оплаты. Попробуйте позже.");
		},
	});

	const downgradeSubscriptionMutation = useMutation<SubscriptionResponseDto, unknown, DowngradeSubscriptionDto>({
		mutationFn: SubscriptionsApi.downgrade,
		onMutate: () => {
			setSubscriptionActionError(null);
		},
		onSuccess: async () => {
			await checkAuth();
		},
		onError: () => {
			setSubscriptionActionError("Не удалось изменить тариф. Попробуйте позже.");
		},
	});

	const {
		data: activePaymentMethod,
		isError: paymentMethodError,
		isLoading: paymentMethodLoading,
		isFetching: paymentMethodFetching,
		refetch: refetchPaymentMethod,
	} = useQuery<SubscriptionPaymentMethodResponseDto | null>({
		queryKey: ["subscriptions", "payment-method"],
		queryFn: PaymentsApi.getActivePaymentMethod,
		enabled: Boolean(user?.id),
		staleTime: 60_000,
	});

	const deletePaymentMethodMutation = useMutation({
		mutationFn: PaymentsApi.deletePaymentMethod,
		onMutate: () => {
			setPaymentMethodActionError(null);
		},
		onSuccess: () => {
			void refetchPaymentMethod();
		},
		onError: () => {
			setPaymentMethodActionError("Не удалось удалить способ оплаты. Попробуйте позже.");
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
	const currentTierPower =
		user.subscription_tier?.power ?? tiers?.find(tier => tier.id === currentTierId)?.power ?? null;

	const paymentMethodDetails = useMemo(() => {
		if (!activePaymentMethod) return null;
		if (activePaymentMethod.title) return activePaymentMethod.title;
		if (activePaymentMethod.description) return activePaymentMethod.description;
		const cardLast4 = activePaymentMethod.details?.card?.last4;
		if (cardLast4) return `•••• ${cardLast4}`;
		if (activePaymentMethod.details?.phone) return activePaymentMethod.details.phone;
		return null;
	}, [activePaymentMethod]);

	async function handleUpgrade(tierId: string) {
		if (createPaymentFormMutation.isPending) return;
		try {
			await createPaymentFormMutation.mutateAsync({ subscription_tier_id: tierId });
		} catch {
			// onError handler already updates the UI
		}
	}

	async function handleDowngrade(tierId: string) {
		if (downgradeSubscriptionMutation.isPending) return;
		try {
			await downgradeSubscriptionMutation.mutateAsync({ subscriptionTierId: tierId });
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

			{subscriptionActionError && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
					{subscriptionActionError}
				</div>
			)}

			<div className="rounded-xl border p-5">
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold">Сохранённый способ оплаты</h2>
							<p className="text-sm text-muted-foreground">Используется для автопродления подписки.</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={!activePaymentMethod || deletePaymentMethodMutation.isPending}
							onClick={() => {
								if (!activePaymentMethod || deletePaymentMethodMutation.isPending) return;
								void deletePaymentMethodMutation.mutateAsync();
							}}
						>
							{deletePaymentMethodMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Удаление…
								</>
							) : (
								"Удалить"
							)}
						</Button>
					</div>

					{paymentMethodActionError && <p className="text-sm text-destructive">{paymentMethodActionError}</p>}
				</div>

				<div className="mt-4 min-h-[88px]">
					{paymentMethodLoading || paymentMethodFetching ? (
						<div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
							<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка способа оплаты…
						</div>
					) : paymentMethodError ? (
						<div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
							<p className="text-destructive">Не удалось загрузить способ оплаты.</p>
							<Button variant="outline" size="sm" onClick={() => refetchPaymentMethod()}>
								<RefreshCcw className="mr-2 h-4 w-4" />
								Повторить
							</Button>
						</div>
					) : activePaymentMethod ? (
						<div className="rounded-lg border bg-muted/30 p-4">
							<div className="flex flex-wrap items-center gap-3">
								<Badge variant="secondary">
									{paymentMethodTypeLabels[activePaymentMethod.type] ?? activePaymentMethod.type}
								</Badge>
								{paymentMethodDetails && <span className="text-sm text-muted-foreground">{paymentMethodDetails}</span>}
							</div>
							<p className="mt-2 text-xs text-muted-foreground">ID способа оплаты: {activePaymentMethod.id}</p>
						</div>
					) : (
						<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
							<p>
								Сохранённый способ оплаты отсутствует. Он появится после успешной оплаты и будет использован для{" "}
								автопродления.
							</p>
						</div>
					)}
				</div>
			</div>

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
						const isUpgradeProcessing =
							createPaymentFormMutation.isPending &&
							createPaymentFormMutation.variables?.subscription_tier_id === tier.id;
						const isDowngradeProcessing =
							downgradeSubscriptionMutation.isPending &&
							downgradeSubscriptionMutation.variables?.subscriptionTierId === tier.id;
						const isProcessing = isUpgradeProcessing || isDowngradeProcessing;
						const isDowngrade = typeof currentTierPower === "number" ? tier.power < currentTierPower : false;
						const footer = (
							<Button
								variant={isCurrent ? "secondary" : "default"}
								disabled={isCurrent || isProcessing}
								onClick={() => {
									if (isCurrent) return;
									if (isDowngrade) {
										void handleDowngrade(tier.id);
										return;
									}
									void handleUpgrade(tier.id);
								}}
							>
								{isCurrent ? (
									"Это ваш тир"
								) : isProcessing ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{isDowngradeProcessing ? "Переключение…" : "Создание формы…"}
									</>
								) : isDowngrade ? (
									"Перейти на этот тир"
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
