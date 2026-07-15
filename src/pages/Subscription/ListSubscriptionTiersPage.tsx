import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { GiftsApi, type GiftListItemDto } from "@/api/giftsApi";
import { PaymentsApi } from "@/api/paymentsApi";
import { SubscriptionsApi, type GetSubscriptionResponseDto } from "@/api/subscriptionsApi";
import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { ConfirmActionDialog } from "@/components/common/dialogs/ConfirmActionDialog";
import { ConfirmDeletionDialog } from "@/components/common/dialogs/ConfirmDeletionDialog";
import { SubscriptionTierCard } from "@/components/subscriptions/SubscriptionTierCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatPrice } from "./subscriptionHelpers";
import { Gift, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";

const SUBSCRIPTION_REFETCH_ATTEMPTS = 12;
const SUBSCRIPTION_REFETCH_DELAY_MS = 2_000;
const GIFTS_QUERY_PARAMS = { page: 1, pageSize: 100 } as const;

type SubscriptionTiersView = "paid" | "gifted";
type GiftSubscriptionStatus = "active" | "available" | "used";

type GiftSubscriptionDisplayItem = {
	id: string;
	status: GiftSubscriptionStatus;
	tier: SubscriptionTierResponseDto;
	durationDays?: number;
	activatedAt?: string | null;
	expiresAt?: string | null;
};

function wait(ms: number) {
	return new Promise(resolve => {
		window.setTimeout(resolve, ms);
	});
}

function toTimestamp(value?: string | null) {
	if (!value) return 0;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortGiftsBySoonestExpiry(a: GiftListItemDto, b: GiftListItemDto) {
	return toTimestamp(a.expiresAt) - toTimestamp(b.expiresAt);
}

export function ListSubscriptionTiersPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, userLoading } = useAuth();
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [purchaseTarget, setPurchaseTarget] = useState<SubscriptionTierResponseDto | null>(null);
	const [isRefreshingSubscription, setIsRefreshingSubscription] = useState(false);
	const [view, setView] = useState<SubscriptionTiersView>("paid");

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

	const {
		data: gifts,
		isError: giftsError,
		isLoading: giftsLoading,
		refetch: refetchGifts,
	} = useQuery({
		queryKey: ["gifts", GIFTS_QUERY_PARAMS],
		queryFn: () => GiftsApi.list(GIFTS_QUERY_PARAMS),
		enabled: user?.role === "subscriber",
		staleTime: 60_000,
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

	const acceptGiftMutation = useMutation({
		mutationFn: GiftsApi.accept,
		onSuccess: async () => {
			toast.success("Подарочная подписка активирована");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["subscription"] }),
				queryClient.invalidateQueries({ queryKey: ["gifts"] }),
				refetchSubscription(),
				refetchGifts(),
			]);
		},
		onError: () => {
			toast.error("Не удалось активировать подарок", {
				description: "Попробуйте ещё раз чуть позже.",
			});
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

	const tiersById = useMemo(() => {
		return new Map((tiers ?? []).map(tier => [tier.id, tier]));
	}, [tiers]);

	const giftedSubscriptions = useMemo<GiftSubscriptionDisplayItem[]>(() => {
		function getGiftTier(gift: GiftListItemDto): SubscriptionTierResponseDto {
			return (
				tiersById.get(gift.tier.id) ?? {
					id: gift.tier.id,
					tier: gift.tier.tier,
					price_rubles: gift.tier.priceRubles,
					power: gift.tier.power,
					permissions: gift.tier.permissions,
				}
			);
		}

		function mapGift(gift: GiftListItemDto, status: GiftSubscriptionStatus): GiftSubscriptionDisplayItem {
			return {
				id: gift.id,
				status,
				tier: getGiftTier(gift),
				durationDays: gift.durationDays,
				activatedAt: gift.activatedAt,
				expiresAt: gift.expiresAt,
			};
		}

		const active = [...(gifts?.currentlyActive ?? [])]
			.sort(sortGiftsBySoonestExpiry)
			.map(gift => mapGift(gift, "active"));
		const available = [...(gifts?.available ?? [])]
			.sort(sortGiftsBySoonestExpiry)
			.map(gift => mapGift(gift, "available"));
		const used = [...(gifts?.used ?? [])]
			.sort((a, b) => toTimestamp(b.activatedAt) - toTimestamp(a.activatedAt))
			.map(gift => mapGift(gift, "used"));

		if (active.length === 0 && subscription?.currentGiftTier) {
			const currentGiftTier = subscription.currentGiftTier;
			const tier = tiersById.get(currentGiftTier.id) ?? {
				id: currentGiftTier.id,
				tier: currentGiftTier.name,
				price_rubles: 0,
				power: currentGiftTier.power ?? 0,
				permissions: currentGiftTier.permissions,
			};

			active.push({
				id: `current-gift-${currentGiftTier.id}`,
				status: "active",
				tier,
				expiresAt: currentGiftTier.until,
			});
		}

		return [...active, ...available, ...used];
	}, [gifts, subscription?.currentGiftTier, tiersById]);

	const isAdmin = user?.role === "admin";
	const isSubscriber = user?.role === "subscriber";
	const currentTierPower = subscription?.currentTier.power ?? null;
	const currentTierName = subscription?.currentGiftTier?.name ?? subscription?.currentTier.name ?? "текущий уровень";
	const hasActiveGift = Boolean(subscription?.currentGiftTier) || (gifts?.currentlyActive?.length ?? 0) > 0;

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

	function handleAcceptGift(gift: GiftSubscriptionDisplayItem) {
		if (gift.status !== "available" || hasActiveGift || acceptGiftMutation.isPending) return;
		void acceptGiftMutation.mutateAsync(gift.id);
	}

	function getGiftBadge(gift: GiftSubscriptionDisplayItem) {
		if (gift.status === "active") return <Badge variant="secondary">Подарок активен</Badge>;
		if (gift.status === "available") return <Badge variant="outline">Доступен</Badge>;
		return <Badge variant="outline">Уже использован</Badge>;
	}

	function getGiftPriceLabel(gift: GiftSubscriptionDisplayItem) {
		if (gift.durationDays) return `Подарок на ${gift.durationDays} дн.`;
		return "Подарочная подписка";
	}

	function getGiftMeta(gift: GiftSubscriptionDisplayItem) {
		const expiresAt = formatDate(gift.expiresAt);
		const activatedAt = formatDate(gift.activatedAt);

		if (gift.status === "active") {
			return expiresAt ? `Активен до ${expiresAt}` : "Активен сейчас";
		}

		if (gift.status === "available") {
			return expiresAt ? `Доступен до ${expiresAt}` : "Можно активировать";
		}

		if (activatedAt && expiresAt) return `Активирован ${activatedAt}, закончился ${expiresAt}`;
		if (activatedAt) return `Активирован ${activatedAt}`;
		if (expiresAt) return `Закончился ${expiresAt}`;
		return "Больше не активен";
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
							: view === "gifted"
								? "Ваши подарочные подписки - за них ничего платить не надо"
								: "Выберите тариф. Перед оплатой мы покажем сумму списания и попросим подтверждение."}
					</p>
				</div>
				{isSubscriber && (
					<Tabs value={view} onValueChange={value => setView(value as SubscriptionTiersView)}>
						<TabsList>
							<TabsTrigger value="paid">Платные</TabsTrigger>
							<TabsTrigger value="gifted">Подаренные</TabsTrigger>
						</TabsList>
					</Tabs>
				)}
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

			{view === "paid" &&
				(sortedTiers.length === 0 ? (
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
							const isGiftedTier = subscription?.currentGiftTier?.id === tier.id;
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
									priceLabel={isSubscriber && isGiftedTier ? "Бесплатно" : undefined}
									footer={footer}
								/>
							);
						})}
					</div>
				))}

			{isSubscriber &&
				view === "gifted" &&
				(giftsLoading ? (
					<div className="min-h-[240px] grid place-items-center text-muted-foreground">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : giftsError ? (
					<div className="min-h-[240px] flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
						<p>Не удалось загрузить подарочные подписки.</p>
						<Button onClick={() => refetchGifts()}>
							<RefreshCcw className="mr-2 h-4 w-4" />
							Повторить
						</Button>
					</div>
				) : giftedSubscriptions.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="py-10 flex flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
							<Gift className="h-6 w-6" />
							<p>У вас пока нет подарочных подписок.</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{giftedSubscriptions.map(gift => {
							const pendingThisGift = acceptGiftMutation.isPending && acceptGiftMutation.variables === gift.id;
							const canSelectGift = gift.status === "available" && !hasActiveGift;
							const footer =
								gift.status === "active" ? (
									<div className="flex w-full justify-end">
										<Button size="sm" disabled>
											Активен
										</Button>
									</div>
								) : gift.status === "available" ? (
									<div className="flex w-full flex-col items-end gap-2">
										{hasActiveGift && (
											<p className="text-right text-xs text-muted-foreground">Сначала завершится текущий подарок.</p>
										)}
										<Button
											size="sm"
											disabled={!canSelectGift || acceptGiftMutation.isPending}
											onClick={() => handleAcceptGift(gift)}
										>
											{pendingThisGift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
											Выбрать
										</Button>
									</div>
								) : (
									<div className="flex w-full justify-end">
										<Button size="sm" variant="outline" disabled>
											Недоступен
										</Button>
									</div>
								);

							return (
								<SubscriptionTierCard
									key={gift.id}
									tier={gift.tier}
									isCurrent={gift.status === "active"}
									headerAction={getGiftBadge(gift)}
									priceLabel={
										<div className="space-y-1">
											<p>{getGiftPriceLabel(gift)}</p>
											<p className="text-xs text-muted-foreground">{getGiftMeta(gift)}</p>
										</div>
									}
									className={gift.status === "used" ? "bg-muted/30 opacity-75" : undefined}
									footer={footer}
								/>
							);
						})}
					</div>
				))}

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
