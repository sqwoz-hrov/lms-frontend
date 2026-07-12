import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Gift, Loader2, RefreshCcw } from "lucide-react";

import {
	PaymentsApi,
	type PaymentMethodConfirmationResponseDto,
	type PaymentMethodResponseDto,
} from "@/api/paymentsApi";
import { SubscriptionsApi, type GetSubscriptionResponseDto } from "@/api/subscriptionsApi";
import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { ConfirmDeletionDialog } from "@/components/common/dialogs/ConfirmDeletionDialog";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const TIER_CACHE_TIME_MS = 60 * 60 * 1000;

type DisplayTier =
	| SubscriptionTierResponseDto
	| GetSubscriptionResponseDto["currentTier"]
	| GetSubscriptionResponseDto["nextTier"]
	| NonNullable<GetSubscriptionResponseDto["currentGiftTier"]>;

function formatDate(value?: string | null) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

function formatPrice(value?: number | null) {
	if (typeof value !== "number") return "0 ₽";
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function getTierName(tier?: DisplayTier | null) {
	return tier ? ("name" in tier ? tier.name : tier.tier) : "тариф";
}

export function SubscriptionPage() {
	const { user, userLoading } = useAuth();
	const [paymentMethodActionError, setPaymentMethodActionError] = useState<string | null>(null);
	const [manageDialogOpen, setManageDialogOpen] = useState(false);
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
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
		queryKey: ["subscriptions", "payment-method"],
		queryFn: PaymentsApi.getActivePaymentMethod,
		enabled: Boolean(user?.id),
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
			setManageDialogOpen(false);
			await refetchPaymentMethod();
		},
		onError: () => {
			setPaymentMethodActionError("Не удалось отменить автопродление. Попробуйте позже.");
		},
		onSettled: () => setCancelDialogOpen(false),
	});

	const tiersById = useMemo(() => {
		return new Map((tiers ?? []).map(tier => [tier.id, tier]));
	}, [tiers]);

	const currentFullTier = subscription ? tiersById.get(subscription.currentTier.id) : undefined;
	const giftFullTier = subscription?.currentGiftTier ? tiersById.get(subscription.currentGiftTier.id) : undefined;
	const nextFullTier = subscription ? tiersById.get(subscription.nextTier.id) : undefined;
	const currentTierPower =
		typeof subscription?.currentTier.power === "number"
			? subscription.currentTier.power
			: (currentFullTier?.power ?? null);
	const isFreeTier = currentTierPower === 0;
	const activeAccessTier = subscription?.currentGiftTier
		? (giftFullTier ?? subscription.currentGiftTier)
		: (currentFullTier ?? subscription?.currentTier);
	const activeAccessFullTier = subscription?.currentGiftTier ? giftFullTier : currentFullTier;
	const activeTierMarkdown = activeAccessFullTier?.markdown_description?.trim();
	const nextBillingDate = formatDate(subscription?.nextPayment.date);
	const giftUntilDate = formatDate(subscription?.currentGiftTier?.until);
	const currentTierUntilDate = formatDate(subscription?.currentTier.until);
	const tierAfterGift =
		subscription?.currentGiftTier &&
		subscription.currentTier.until &&
		subscription.currentGiftTier.until > subscription.currentTier.until
			? (nextFullTier ?? subscription.nextTier)
			: (currentFullTier ?? subscription?.currentTier ?? null);

	function showTierDetails(tier?: DisplayTier | null) {
		if (!tier) return;
		setSelectedTier(tiersById.get(tier.id) ?? null);
	}

	function tierButton(tier?: DisplayTier | null) {
		if (!tier) return null;
		const fullTier = tiersById.get(tier.id);
		const canOpen = Boolean(fullTier);

		return (
			<button
				type="button"
				className="font-semibold text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:text-foreground"
				disabled={!canOpen}
				onClick={() => showTierDetails(tier)}
			>
				{getTierName(fullTier ?? tier)}
			</button>
		);
	}

	function handleChangePaymentMethod() {
		if (addPaymentMethodMutation.isPending) return;
		void addPaymentMethodMutation.mutateAsync();
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

	const isLoading = subscriptionLoading || tiersLoading || paymentMethodLoading;
	const hasLoadError = subscriptionError || tiersError;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
			{activePaymentMethod?.problemsWithPaymentMethod && (
				<div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-2">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<span className="font-medium">Не удалось списать деньги за подписку</span>
					</div>
					<Button
						variant="destructive"
						size="sm"
						disabled={addPaymentMethodMutation.isPending}
						onClick={handleChangePaymentMethod}
					>
						{addPaymentMethodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						Изменить способ оплаты
					</Button>
				</div>
			)}

			{paymentMethodActionError && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
					{paymentMethodActionError}
				</div>
			)}

			{isLoading && (
				<div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed">
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

			{!isLoading && !hasLoadError && paymentMethodError && (
				<div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
					<p className="text-destructive">Не удалось проверить способ оплаты.</p>
					<Button variant="outline" size="sm" onClick={() => refetchPaymentMethod()}>
						<RefreshCcw className="h-4 w-4" />
						Повторить
					</Button>
				</div>
			)}

			{!isLoading && !hasLoadError && subscription && isFreeTier && (
				<section className="space-y-5">
					<h1 className="text-3xl font-semibold tracking-normal">Сейчас вы не подписаны</h1>
					<div className="max-w-4xl space-y-4 rounded-lg border p-6 text-base leading-relaxed text-foreground sm:p-8">
						<p>Привяжите свою карту, чтобы начать пользоваться всеми плюшками сквозь эйчаров платформы уже сейчас</p>
						<p>Если вам просто посмотреть: воспользуйтесь пробным периодом или возьмите и отмените подписку</p>
						<p>
							Это безопасно: мы не храним ваши платёжные данные, а отменить подписку вы сможете в любой момент. Если
							отмените, подписка будет действовать до конца оплаченного периода.
						</p>
					</div>
				</section>
			)}

			{!isLoading && !hasLoadError && subscription && !isFreeTier && (
				<section className="space-y-5">
					<h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-normal">
						{subscription.currentGiftTier && <Gift className="h-7 w-7 text-primary" />}
						<span>Вы подписаны (уровень: {tierButton(activeAccessTier)})</span>
					</h1>

					<div className="space-y-7 rounded-lg border p-6 sm:p-8">
						<div className="space-y-1 text-base leading-relaxed text-foreground">
							{nextBillingDate ? (
								<p>
									Следующее списание: {nextBillingDate}. После него будет активен уровень{" "}
									{tierButton(nextFullTier ?? subscription.nextTier)}, стоимость списания:{" "}
									{formatPrice(subscription.nextPayment.amount)}.
								</p>
							) : (
								<p>Следующее списание не запланировано.</p>
							)}
							{subscription.currentGiftTier && giftUntilDate && (
								<p>
									Подарок активен до: {giftUntilDate}. После подарка будет активен уровень {tierButton(tierAfterGift)}.
								</p>
							)}
							{!subscription.currentGiftTier && currentTierUntilDate && !nextBillingDate && (
								<p>Текущий оплаченный период действует до: {currentTierUntilDate}.</p>
							)}
						</div>

						<div className="space-y-3">
							<h2 className="text-xl font-semibold">Вам доступно</h2>
							{activeTierMarkdown ? (
								<MarkdownRenderer
									markdown={activeTierMarkdown}
									mode="full"
									className="text-base leading-relaxed text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground"
								/>
							) : activeAccessTier?.permissions.length ? (
								<ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-foreground">
									{activeAccessTier.permissions.map(permission => (
										<li key={permission}>{permission}</li>
									))}
								</ul>
							) : (
								<p className="text-base text-muted-foreground">Описание тарифа пока не заполнено.</p>
							)}
						</div>

						<div className="space-y-5">
							<p className="max-w-4xl text-base leading-relaxed text-foreground">
								Если вам нужно изменить или отменить подписку, нажмите на большую кнопку ниже. Подписка останется с вами
								до конца оплаченного периода.
							</p>
							<Button size="lg" className="h-12 px-8 text-base" onClick={() => setManageDialogOpen(true)}>
								Manage subscription
							</Button>
						</div>
					</div>
				</section>
			)}

			<Dialog open={Boolean(selectedTier)} onOpenChange={open => !open && setSelectedTier(null)}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{selectedTier?.tier}</DialogTitle>
						<DialogDescription>{formatPrice(selectedTier?.price_rubles)} / мес</DialogDescription>
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

			<Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Управление подпиской</DialogTitle>
						<DialogDescription>
							Можно изменить способ оплаты или отменить автопродление. Доступ останется до конца оплаченного периода.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							disabled={deletePaymentMethodMutation.isPending || !activePaymentMethod}
							onClick={() => setCancelDialogOpen(true)}
						>
							Отменить автопродление
						</Button>
						<Button disabled={addPaymentMethodMutation.isPending} onClick={handleChangePaymentMethod}>
							{addPaymentMethodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
							Изменить способ оплаты
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ConfirmDeletionDialog
				entityName="автопродление"
				description="Сохранённый способ оплаты будет отвязан. Уже оплаченная подписка продолжит работать до конца периода."
				open={cancelDialogOpen}
				onOpenChange={setCancelDialogOpen}
				onConfirm={() => {
					if (!activePaymentMethod || deletePaymentMethodMutation.isPending) return;
					void deletePaymentMethodMutation.mutateAsync();
				}}
				pending={deletePaymentMethodMutation.isPending}
			/>
		</div>
	);
}
