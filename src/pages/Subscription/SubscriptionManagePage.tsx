import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowRight,
	CreditCard,
	History,
	Loader2,
	RefreshCcw,
	TrendingDown,
	TrendingUp,
	Crown,
	Calendar,
} from "lucide-react";

import {
	PaymentsApi,
	type PaymentHistoryItemDto,
	type PaymentMethodConfirmationResponseDto,
	type PaymentMethodResponseDto,
} from "@/api/paymentsApi";
import { GiftsApi, type GiftListItemDto } from "@/api/giftsApi";
import { SubscriptionsApi, type GetSubscriptionResponseDto } from "@/api/subscriptionsApi";
import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { ConfirmDeletionDialog } from "@/components/common/dialogs/ConfirmDeletionDialog";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { GiftAvailabilityBanner } from "@/components/subscriptions/GiftAvailabilityBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import {
	PAYMENT_METHOD_QUERY_KEY,
	TIER_CACHE_TIME_MS,
	LOWER_TIER_GIFT_MESSAGE,
	canActivateGiftWithCurrentPower,
	formatDate,
	formatDateTime,
	formatPaymentMethodName,
	formatPrice,
	formatSubscriptionPeriodPrice,
	formatSubscriptionPrice,
	getBestApplicableGift,
	getGiftActivationErrorMessage,
	getTierPower,
	getTierName,
} from "./subscriptionHelpers";
import { toast } from "sonner";

const HISTORY_PREVIEW_QUERY_KEY = ["payments", "history", { page: 1, pageSize: 5 }] as const;

function PaymentHistoryPreview({
	items,
	loading,
	error,
	onRetry,
}: {
	items?: PaymentHistoryItemDto[];
	loading: boolean;
	error: boolean;
	onRetry: () => void;
}) {
	if (loading) {
		return (
			<div className="flex min-h-[220px] items-center justify-center text-muted-foreground">
				<Loader2 className="h-5 w-5 animate-spin" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center text-sm">
				<p className="text-destructive">Не удалось загрузить историю операций.</p>
				<Button variant="outline" size="sm" onClick={onRetry}>
					<RefreshCcw className="h-4 w-4" />
					Повторить
				</Button>
			</div>
		);
	}

	if (!items?.length) {
		return (
			<div className="flex min-h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
				История списаний пока пуста.
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Операция</TableHead>
					<TableHead className="text-right">Сумма</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item, index) => (
					<TableRow key={`${item.date}-${index}`}>
						<TableCell>
							<div className="space-y-1">
								<p className="font-medium">{item.paymentMethodName}</p>
								<p className="text-xs text-muted-foreground">{formatDateTime(item.date) ?? item.date}</p>
							</div>
						</TableCell>
						<TableCell className="text-right font-medium">{formatPrice(item.amount, item.currency)}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export function SubscriptionManagePage() {
	const { user, userLoading } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [paymentMethodActionError, setPaymentMethodActionError] = useState<string | null>(null);
	const [selectedTier, setSelectedTier] = useState<SubscriptionTierResponseDto | null>(null);

	const {
		data: subscription,
		isError: subscriptionError,
		isLoading: subscriptionLoading,
		refetch: refetchSubscription,
	} = useQuery<GetSubscriptionResponseDto>({
		queryKey: ["subscription"],
		queryFn: SubscriptionsApi.getCurrent,
		enabled: Boolean(user?.id),
	});

	const {
		data: tiers,
		isError: tiersError,
		isLoading: tiersLoading,
		refetch: refetchTiers,
	} = useQuery<SubscriptionTierResponseDto[]>({
		queryKey: ["subscription-tiers"],
		queryFn: SubscriptionTiersApi.list,
		enabled: Boolean(user?.id),
		staleTime: TIER_CACHE_TIME_MS,
		gcTime: TIER_CACHE_TIME_MS,
	});

	const {
		data: activePaymentMethod,
		isError: paymentMethodError,
		isLoading: paymentMethodLoading,
		refetch: refetchPaymentMethod,
	} = useQuery<PaymentMethodResponseDto | null>({
		queryKey: PAYMENT_METHOD_QUERY_KEY,
		queryFn: async () => {
			const serverPaymentMethod = await PaymentsApi.getActivePaymentMethod();
			return serverPaymentMethod;
		},
		enabled: Boolean(user?.id),
		staleTime: 60_000,
	});

	const {
		data: historyPreview,
		isError: historyPreviewError,
		isLoading: historyPreviewLoading,
		refetch: refetchHistoryPreview,
	} = useQuery({
		queryKey: HISTORY_PREVIEW_QUERY_KEY,
		queryFn: () => PaymentsApi.listHistory({ page: 1, pageSize: 5 }),
		enabled: Boolean(user?.id),
		staleTime: 60_000,
	});

	const {
		data: gifts,
		isError: giftsError,
		isLoading: giftsLoading,
		refetch: refetchGifts,
	} = useQuery({
		queryKey: ["gifts", { page: 1, pageSize: 20 }],
		queryFn: () => GiftsApi.list({ page: 1, pageSize: 20 }),
		enabled: user?.role === "subscriber",
		staleTime: 60_000,
	});

	const addPaymentMethodMutation = useMutation<PaymentMethodConfirmationResponseDto>({
		mutationFn: PaymentsApi.addPaymentMethod,
		onMutate: () => setPaymentMethodActionError(null),
		onSuccess: data => {
			if (data?.confirmation_url) {
				window.location.assign(data.confirmation_url);
				return;
			}
			setPaymentMethodActionError("Не удалось получить ссылку на изменение способа оплаты. Попробуйте снова.");
		},
		onError: () => {
			setPaymentMethodActionError("Не удалось открыть изменение способа оплаты. Попробуйте позже.");
		},
	});

	const deletePaymentMethodMutation = useMutation({
		mutationFn: PaymentsApi.deletePaymentMethod,
		onMutate: () => setPaymentMethodActionError(null),
		onSuccess: async () => {
			setPaymentDialogOpen(false);
			await refetchPaymentMethod();
		},
		onError: () => {
			setPaymentMethodActionError("Не удалось удалить способ оплаты. Попробуйте позже.");
		},
		onSettled: () => setCancelDialogOpen(false),
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
		onError: error => {
			toast.error("Не удалось активировать подарок", {
				description: getGiftActivationErrorMessage(error),
			});
		},
	});

	const tiersById = useMemo(() => {
		return new Map((tiers ?? []).map(tier => [tier.id, tier]));
	}, [tiers]);

	const currentFullTier = subscription ? tiersById.get(subscription.currentTier.id) : undefined;
	const giftFullTier = subscription?.currentGiftTier ? tiersById.get(subscription.currentGiftTier.id) : undefined;
	const nextFullTier = subscription ? tiersById.get(subscription.nextTier.id) : undefined;
	const activeAccessTier = subscription?.currentGiftTier
		? (giftFullTier ?? subscription.currentGiftTier)
		: (currentFullTier ?? subscription?.currentTier);
	const currentTierPower =
		typeof subscription?.currentTier.power === "number"
			? subscription.currentTier.power
			: (currentFullTier?.power ?? null);
	const isFreeTier = currentTierPower === 0;
	const nextBillingDate = formatDate(subscription?.nextPayment.date);
	const giftUntilDate = formatDate(subscription?.currentGiftTier?.until);
	const currentTierUntilDate = formatDate(subscription?.currentTier.until);
	const isCurrentAccessFree =
		Boolean(subscription?.currentGiftTier) || currentTierPower === 0 || currentFullTier?.price_rubles === 0;
	const isNextTierFree =
		subscription?.nextPayment.amount === 0 ||
		nextFullTier?.price_rubles === 0 ||
		(typeof subscription?.nextTier.power === "number" && subscription.nextTier.power === 0);
	const shouldShowNextBillingDate = Boolean(nextBillingDate) && !(isCurrentAccessFree && isNextTierFree);
	const paymentMethodName = formatPaymentMethodName(activePaymentMethod);
	const isLoading = subscriptionLoading || tiersLoading || paymentMethodLoading;
	const hasLoadError = subscriptionError || tiersError;
	const availableGifts = gifts?.available ?? [];
	const activeAccessTierPower = getTierPower(activeAccessTier);
	const nextTierPower = getTierPower(nextFullTier ?? subscription?.nextTier);
	const isNextTierDowngrade =
		typeof activeAccessTierPower === "number" && typeof nextTierPower === "number"
			? nextTierPower < activeAccessTierPower
			: false;
	const isSameTierPower =
		typeof activeAccessTierPower === "number" && typeof nextTierPower === "number"
			? nextTierPower === activeAccessTierPower
			: false;
	const NextTierTrendIcon = isNextTierDowngrade ? TrendingDown : isSameTierPower ? Calendar : TrendingUp;
	const availableGiftSummary = getBestApplicableGift(availableGifts, activeAccessTierPower);

	function handleChangePaymentMethod() {
		if (addPaymentMethodMutation.isPending) return;
		void addPaymentMethodMutation.mutateAsync();
	}

	function showTierDetails(tierId?: string | null) {
		if (!tierId) return;
		const tier = tiersById.get(tierId);
		if (tier) setSelectedTier(tier);
	}

	function handleDeletePaymentMethod() {
		if (!activePaymentMethod || deletePaymentMethodMutation.isPending) return;

		void deletePaymentMethodMutation.mutateAsync();
	}

	function handleAcceptGift(gift: GiftListItemDto) {
		if (acceptGiftMutation.isPending) return;

		if (!canActivateGiftWithCurrentPower(gift, activeAccessTierPower)) {
			toast.error("Не удалось активировать подарок", {
				description: LOWER_TIER_GIFT_MESSAGE,
			});
			return;
		}

		void acceptGiftMutation.mutateAsync(gift.id);
	}

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

	if (user.role !== "subscriber" && user.role !== "admin") {
		return <Navigate to="/materials" replace />;
	}

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-normal">Управление подпиской</h1>
					<p className="mt-1 text-sm text-muted-foreground">Подписка, способ оплаты и операции в одном месте.</p>
				</div>
				<Button variant="outline" onClick={() => navigate("/subscription")}>
					Назад к подписке
				</Button>
			</div>

			{paymentMethodActionError && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
					{paymentMethodActionError}
				</div>
			)}

			{isLoading && (
				<div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			)}

			{hasLoadError && (
				<div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
					<p className="text-destructive">Не удалось загрузить информацию о подписке.</p>
					<div className="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" onClick={() => refetchSubscription()}>
							<RefreshCcw className="h-4 w-4" />
							Повторить
						</Button>
						{tiersError && (
							<Button variant="outline" size="sm" onClick={() => refetchTiers()}>
								<RefreshCcw className="h-4 w-4" />
								Загрузить тарифы
							</Button>
						)}
					</div>
				</div>
			)}

			{!isLoading && !hasLoadError && subscription && (
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Управление подпиской</CardTitle>
								<CardDescription>Текущий уровень и ближайшее изменение.</CardDescription>
								<CardAction>
									<Badge variant={isFreeTier ? "outline" : "secondary"}>
										{isFreeTier ? "Без подписки" : "Активна"}
									</Badge>
								</CardAction>
							</CardHeader>
							<CardContent className="space-y-5">
								<div className="grid gap-4 sm:grid-cols-2">
									<button
										type="button"
										className="flex h-full flex-col items-start rounded-lg border p-4 text-left transition-colors hover:border-muted-foreground/40 disabled:pointer-events-none"
										disabled={!activeAccessTier?.id || !tiersById.has(activeAccessTier.id)}
										onClick={() => showTierDetails(activeAccessTier?.id)}
									>
										<div className="flex items-center gap-2 text-sm leading-none text-muted-foreground">
											<Crown className="h-4 w-4 shrink-0" />
											Текущий уровень
										</div>
										<div className="mt-2 text-xl font-semibold leading-tight">{getTierName(activeAccessTier)}</div>
										{subscription.currentGiftTier ? (
											<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
												Подарочная подписка{giftUntilDate ? ` до ${giftUntilDate}` : ""}
											</p>
										) : (
											<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
												{formatSubscriptionPeriodPrice(currentFullTier?.price_rubles)}
											</p>
										)}
									</button>

									<button
										type="button"
										className="flex h-full flex-col items-start rounded-lg border p-4 text-left transition-colors hover:border-muted-foreground/40 disabled:pointer-events-none"
										disabled={!subscription.nextTier.id || !tiersById.has(subscription.nextTier.id)}
										onClick={() => showTierDetails(subscription.nextTier.id)}
									>
										<div className="flex items-center gap-2 text-sm leading-none text-muted-foreground">
											<NextTierTrendIcon className="h-4 w-4 shrink-0" />
											Следующий уровень
										</div>
										<div className="mt-2 text-xl font-semibold leading-tight">
											{getTierName(nextFullTier ?? subscription.nextTier)}
										</div>
										{shouldShowNextBillingDate ? (
											subscription.nextPayment.amount > 0 ? (
												<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
													Списание {nextBillingDate} на {formatPrice(subscription.nextPayment.amount)}
												</p>
											) : (
												<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
													Изменение {nextBillingDate}: {formatSubscriptionPrice(subscription.nextPayment.amount)}
												</p>
											)
										) : currentTierUntilDate && !isCurrentAccessFree ? (
											<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
												Оплаченный период действует до {currentTierUntilDate}
											</p>
										) : (
											<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
												Следующее списание не запланировано.
											</p>
										)}
									</button>
								</div>

								{giftsLoading && (
									<div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										Проверяем доступные подарки
									</div>
								)}

								{giftsError && (
									<div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
										<p className="text-destructive">Не удалось загрузить доступные подарки.</p>
										<Button variant="outline" size="sm" onClick={() => refetchGifts()}>
											<RefreshCcw className="h-4 w-4" />
											Повторить
										</Button>
									</div>
								)}

								{availableGiftSummary.bestGift && (
									<GiftAvailabilityBanner
										gift={availableGiftSummary.bestGift}
										extraGiftCount={availableGiftSummary.extraGiftCount}
										pending={acceptGiftMutation.isPending}
										onAccept={() => handleAcceptGift(availableGiftSummary.bestGift)}
										onViewGifts={() => navigate("/subscription-tiers?view=gifted")}
									/>
								)}

								<Button onClick={() => navigate("/subscription-tiers")}>
									Изменить
									<ArrowRight className="h-4 w-4" />
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Управление платежами</CardTitle>
								<CardDescription>Способ оплаты, автопродление и история операций.</CardDescription>
								<CardAction>
									<CreditCard className="h-5 w-5 text-muted-foreground" />
								</CardAction>
							</CardHeader>
							<CardContent className="space-y-5">
								{paymentMethodError ? (
									<div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
										<p className="text-destructive">Не удалось проверить способ оплаты.</p>
										<Button variant="outline" size="sm" onClick={() => refetchPaymentMethod()}>
											<RefreshCcw className="h-4 w-4" />
											Повторить
										</Button>
									</div>
								) : (
									<div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="text-sm text-muted-foreground">Способ оплаты</p>
											<p className="text-lg font-semibold">{paymentMethodName}</p>
											{activePaymentMethod?.problemsWithPaymentMethod && (
												<p className="mt-1 text-sm text-destructive">Есть проблема с последним списанием.</p>
											)}
										</div>
										<Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
											{activePaymentMethod ? "Изменить" : "Добавить"}
										</Button>
									</div>
								)}

								<Separator />

								<div className="flex flex-wrap gap-2">
									<Button variant="secondary" asChild>
										<Link to="/subscription/history">
											<History className="h-4 w-4" />
											История операций
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>История списаний</CardTitle>
							<CardDescription>Последние 5 успешных операций.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-5">
							<PaymentHistoryPreview
								items={historyPreview?.items}
								loading={historyPreviewLoading}
								error={historyPreviewError}
								onRetry={() => refetchHistoryPreview()}
							/>
							<Button variant="outline" className="w-full" asChild>
								<Link to="/subscription/history">
									Показать все
									<ArrowRight className="h-4 w-4" />
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			)}

			<Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Управление способом оплаты</DialogTitle>
						<DialogDescription>
							Можно добавить новую карту или удалить текущий способ оплаты. Уже оплаченный доступ сохранится до конца
							периода.
						</DialogDescription>
					</DialogHeader>

					<div className="rounded-lg border p-4">
						<p className="text-sm text-muted-foreground">Текущий способ оплаты</p>
						<p className="mt-1 text-lg font-semibold">{paymentMethodName}</p>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							disabled={deletePaymentMethodMutation.isPending || !activePaymentMethod}
							onClick={() => setCancelDialogOpen(true)}
						>
							Удалить карту
						</Button>
						<Button disabled={addPaymentMethodMutation.isPending} onClick={handleChangePaymentMethod}>
							{addPaymentMethodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							{activePaymentMethod ? "Изменить карту" : "Добавить карту"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={Boolean(selectedTier)} onOpenChange={open => !open && setSelectedTier(null)}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{selectedTier?.tier}</DialogTitle>
						<DialogDescription>
							{selectedTier?.id === subscription?.currentGiftTier?.id
								? "Бесплатно"
								: formatSubscriptionPeriodPrice(selectedTier?.price_rubles)}
						</DialogDescription>
					</DialogHeader>
					{selectedTier?.markdown_description?.trim() ? (
						<MarkdownRenderer markdown={selectedTier.markdown_description} mode="full" />
					) : selectedTier?.permissions.length ? (
						<ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
							{selectedTier.permissions.map(permission => (
								<li key={permission}>{permission}</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">Описание тарифа пока не заполнено.</p>
					)}
				</DialogContent>
			</Dialog>

			<ConfirmDeletionDialog
				entityName="способ оплаты"
				description="Сохранённый способ оплаты будет отвязан. Уже оплаченная подписка продолжит работать до конца периода."
				open={cancelDialogOpen}
				onOpenChange={setCancelDialogOpen}
				onConfirm={handleDeletePaymentMethod}
				pending={deletePaymentMethodMutation.isPending}
			/>
		</div>
	);
}
