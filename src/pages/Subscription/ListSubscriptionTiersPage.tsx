import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PaymentsApi } from "@/api/paymentsApi";
import { SubscriptionsApi, type GetSubscriptionResponseDto } from "@/api/subscriptionsApi";
import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { ConfirmActionDialog } from "@/components/common/dialogs/ConfirmActionDialog";
import { ConfirmDeletionDialog } from "@/components/common/dialogs/ConfirmDeletionDialog";
import { SubscriptionTierCard } from "@/components/subscriptions/SubscriptionTierCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "./subscriptionHelpers";
import { Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";

const SUBSCRIPTION_REFETCH_ATTEMPTS = 12;
const SUBSCRIPTION_REFETCH_DELAY_MS = 2_000;

function wait(ms: number) {
	return new Promise(resolve => {
		window.setTimeout(resolve, ms);
	});
}

export function ListSubscriptionTiersPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, userLoading } = useAuth();
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [purchaseTarget, setPurchaseTarget] = useState<SubscriptionTierResponseDto | null>(null);
	const [isRefreshingSubscription, setIsRefreshingSubscription] = useState(false);

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

	const {
		data: subscription,
		isLoading: subscriptionLoading,
		refetch: refetchSubscription,
	} = useQuery<GetSubscriptionResponseDto>({
		queryKey: ["subscription"],
		queryFn: SubscriptionsApi.getCurrent,
		enabled: user?.role === "subscriber",
	});

	const deleteMut = useMutation({
		mutationFn: SubscriptionTiersApi.delete,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
		},
		onSettled: () => {
			setRemovingId(null);
			setDeleteTargetId(null);
		},
		onError: () => {
			setRemovingId(null);
		},
	});

	const chargeMut = useMutation({
		mutationFn: PaymentsApi.chargeSubscription,
		onSuccess: async payment => {
			if (payment.confirmationUrl) {
				window.location.assign(payment.confirmationUrl);
				return;
			}

			toast.success("Оплата запущена", {
				description: "Обновим подписку, когда платежный webhook применит новый тариф.",
			});

			if (purchaseTarget) {
				await pollSubscriptionAfterCharge(purchaseTarget.id);
			}
		},
		onError: () => {
			toast.error("Не удалось оплатить тариф", {
				description: "Проверьте способ оплаты или попробуйте позже.",
			});
		},
		onSettled: () => {
			setPurchaseTarget(null);
		},
	});

	const downgradeMut = useMutation({
		mutationFn: SubscriptionsApi.downgrade,
		onSuccess: async () => {
			toast.success("Следующий тариф обновлён");
			await queryClient.invalidateQueries({ queryKey: ["subscription"] });
			await refetchSubscription();
		},
		onError: () => {
			toast.error("Не удалось изменить следующий тариф", {
				description: "Попробуйте ещё раз чуть позже.",
			});
		},
		onSettled: () => {
			setPurchaseTarget(null);
		},
	});

	const sortedTiers = useMemo(() => {
		if (!tiers) return [];
		return [...tiers].sort((a, b) => a.power - b.power || a.price_rubles - b.price_rubles);
	}, [tiers]);

	const isAdmin = user?.role === "admin";
	const isSubscriber = user?.role === "subscriber";
	const currentTierPower = subscription?.currentTier.power ?? null;
	const currentTierName = subscription?.currentGiftTier?.name ?? subscription?.currentTier.name ?? "текущий уровень";

	function handleCreate() {
		navigate("/admin/subscription-tiers/new");
	}

	function handleEdit(id: string) {
		navigate(`/admin/subscription-tiers/${id}/edit`);
	}

	function handleDelete(id: string) {
		if (deleteMut.isPending) return;
		setDeleteTargetId(id);
	}

	function canPurchase(tier: SubscriptionTierResponseDto) {
		if (!isSubscriber || !subscription) return false;
		if (subscription.currentGiftTier?.id === tier.id) return false;
		if (subscription.currentTier.id === tier.id) return false;
		if (subscription.nextTier.id === tier.id) return false;
		if (typeof currentTierPower === "number" && tier.power < currentTierPower) return true;
		if (typeof currentTierPower === "number" && tier.power > currentTierPower && tier.price_rubles > 0) return true;
		return true;
	}

	function getSubscriberTierLabel(tier: SubscriptionTierResponseDto) {
		if (subscription?.currentGiftTier?.id === tier.id) return "Подарок активен";
		if (subscription?.currentTier.id === tier.id) return "Текущий тариф";
		if (subscription?.nextTier.id === tier.id) return "Следующий тариф";
		return "Выбрать";
	}

	function isDowngradeTarget(tier?: SubscriptionTierResponseDto | null) {
		return Boolean(
			tier &&
				(tier.power === 0 ||
					tier.price_rubles === 0 ||
					(typeof currentTierPower === "number" && tier.power < currentTierPower)),
		);
	}

	function getConfirmTitle() {
		return isDowngradeTarget(purchaseTarget) ? "Подтвердить смену тарифа" : "Подтвердить оплату нового тарифа";
	}

	function getConfirmDescription() {
		if (!purchaseTarget) return undefined;

		const tierName = purchaseTarget.tier;
		const price = formatPrice(purchaseTarget.price_rubles);

		if (isDowngradeTarget(purchaseTarget)) {
			return `Вы понижаете уровень подписки до «${tierName}», ${purchaseTarget.price_rubles !== 0 ? "он будет стоить " + price + " за 30 дней" : "он бесплатный навсегда"}. Текущий уровень «${currentTierName}» останется с вами до конца оплаченного периода, а дальше вы перейдёте на уровень «${tierName}»`;
		}

		return `Вы повышаете уровень подписки до «${tierName}», это будет стоить ${price} за 30 дней. Ваш уровень изменится сразу после оплаты, но вы всегда сможете вернуться к прошлому уровню, если не увидите смысла в новом!`;
	}

	async function pollSubscriptionAfterCharge(targetTierId: string) {
		setIsRefreshingSubscription(true);
		try {
			for (let attempt = 0; attempt < SUBSCRIPTION_REFETCH_ATTEMPTS; attempt += 1) {
				await wait(SUBSCRIPTION_REFETCH_DELAY_MS);
				const result = await refetchSubscription();
				await queryClient.invalidateQueries({ queryKey: ["subscription"] });

				const updatedSubscription = result.data;
				if (
					updatedSubscription?.currentTier.id === targetTierId ||
					updatedSubscription?.nextTier.id === targetTierId ||
					updatedSubscription?.currentGiftTier?.id === targetTierId
				) {
					toast.success("Подписка обновлена");
					return;
				}
			}

			toast.info("Платёж принят", {
				description: "Тариф обновится чуть позже. Мы уже начали обновлять данные подписки.",
			});
		} finally {
			setIsRefreshingSubscription(false);
		}
	}

	function handleConfirmPurchase() {
		if (!purchaseTarget || chargeMut.isPending || downgradeMut.isPending || isRefreshingSubscription) return;
		if (isDowngradeTarget(purchaseTarget)) {
			void downgradeMut.mutateAsync({ subscriptionTierId: purchaseTarget.id });
			return;
		}
		void chargeMut.mutateAsync({ current_tier_id: purchaseTarget.id });
	}

	if (userLoading || isLoading || (isSubscriber && subscriptionLoading)) {
		return (
			<div className="min-h-[60vh] grid place-items-center text-muted-foreground">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (!isAdmin && !isSubscriber) {
		return <Navigate to="/materials" replace />;
	}

	if (isError) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
				<p>Не удалось загрузить тарифы подписки.</p>
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
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Тарифы подписки</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{isAdmin
							? "Управление активными тарифами, ценой, уровнем доступа и описанием для страницы подписки."
							: "Выберите тариф. Перед оплатой мы покажем сумму списания и попросим подтверждение."}
					</p>
				</div>
				{isAdmin && (
					<Button onClick={handleCreate}>
						<Plus className="mr-2 h-4 w-4" />
						Новый тариф
					</Button>
				)}
			</div>

			{deleteMut.isError && (
				<div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
					Не удалось удалить тариф. Попробуйте снова.
				</div>
			)}

			{sortedTiers.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="py-10 flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
						<p>Пока нет ни одного тарифа подписки.</p>
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
						const purchaseAllowed = canPurchase(tier);
						const footer = isAdmin ? (
							<div className="flex w-full items-center justify-end gap-2">
								<Button variant="outline" size="sm" onClick={() => handleEdit(tier.id)} disabled={deleting}>
									Редактировать
								</Button>
								<Button variant="destructive" size="sm" onClick={() => handleDelete(tier.id)} disabled={deleting}>
									{deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
									Удалить
								</Button>
							</div>
						) : (
							<div className="flex w-full items-center justify-end">
								<Button
									size="sm"
									disabled={
										!purchaseAllowed || chargeMut.isPending || downgradeMut.isPending || isRefreshingSubscription
									}
									onClick={() => setPurchaseTarget(tier)}
								>
									{(chargeMut.isPending || downgradeMut.isPending || isRefreshingSubscription) &&
										purchaseTarget?.id === tier.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{getSubscriberTierLabel(tier)}
								</Button>
							</div>
						);
						return (
							<SubscriptionTierCard
								key={tier.id}
								tier={tier}
								isCurrent={subscription?.currentTier.id === tier.id || subscription?.currentGiftTier?.id === tier.id}
								footer={footer}
							/>
						);
					})}
				</div>
			)}

			<ConfirmActionDialog
				open={Boolean(purchaseTarget)}
				onOpenChange={open => {
					if (!open && !chargeMut.isPending && !downgradeMut.isPending && !isRefreshingSubscription) {
						setPurchaseTarget(null);
					}
				}}
				title={getConfirmTitle()}
				description={getConfirmDescription()}
				confirmLabel="Подтвердить"
				pending={chargeMut.isPending || downgradeMut.isPending || isRefreshingSubscription}
				onConfirm={handleConfirmPurchase}
			/>

			<ConfirmDeletionDialog
				entityName="тариф"
				open={Boolean(deleteTargetId)}
				onOpenChange={next => {
					if (!next) setDeleteTargetId(null);
				}}
				onConfirm={async () => {
					if (!deleteTargetId || deleteMut.isPending) return;
					setRemovingId(deleteTargetId);
					await deleteMut.mutateAsync({ id: deleteTargetId }).catch(() => {});
				}}
				pending={deleteMut.isPending}
				description="Тариф будет архивирован и пропадёт из списка активных тарифов."
			/>
		</div>
	);
}
