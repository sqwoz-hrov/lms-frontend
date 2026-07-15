import { useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, Gift, Loader2, RefreshCcw } from "lucide-react";

import {
	PaymentsApi,
	type PaymentMethodConfirmationResponseDto,
	type PaymentMethodResponseDto,
} from "@/api/paymentsApi";
import { SubscriptionsApi, type GetSubscriptionResponseDto } from "@/api/subscriptionsApi";
import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
	IS_DEV_PAYMENT_METHOD_FORM_ENABLED,
	PAYMENT_METHOD_QUERY_KEY,
	TIER_CACHE_TIME_MS,
	formatDate,
	formatPrice,
	getTierName,
	onlyDigits,
	readDevPaymentMethod,
	saveDevPaymentMethod,
	type DisplayTier,
} from "./subscriptionHelpers";

type DevPaymentMethodFormState = {
	cardNumber: string;
	expires: string;
	cardholder: string;
	cvc: string;
};

export function SubscriptionPage() {
	const { user, userLoading } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [paymentMethodActionError, setPaymentMethodActionError] = useState<string | null>(null);
	const [devPaymentMethodDialogOpen, setDevPaymentMethodDialogOpen] = useState(false);
	const [selectedTier, setSelectedTier] = useState<SubscriptionTierResponseDto | null>(null);
	const [devPaymentMethodForm, setDevPaymentMethodForm] = useState<DevPaymentMethodFormState>({
		cardNumber: "",
		expires: "",
		cardholder: "",
		cvc: "",
	});

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
			return serverPaymentMethod ?? readDevPaymentMethod(user?.id);
		},
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
		if (IS_DEV_PAYMENT_METHOD_FORM_ENABLED) {
			setDevPaymentMethodDialogOpen(true);
			return;
		}
		void addPaymentMethodMutation.mutateAsync();
	}

	function handleDevPaymentMethodSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!user) return;

		const cardDigits = onlyDigits(devPaymentMethodForm.cardNumber);
		const expiresDigits = onlyDigits(devPaymentMethodForm.expires);
		const cvcDigits = onlyDigits(devPaymentMethodForm.cvc);

		if (cardDigits.length < 12 || expiresDigits.length !== 4 || cvcDigits.length < 3) {
			setPaymentMethodActionError("Проверьте тестовые данные карты и попробуйте снова.");
			return;
		}

		const now = new Date().toISOString();
		const method: PaymentMethodResponseDto = {
			id: `dev-payment-method-${user.id}`,
			userId: user.id,
			paymentMethodId: `dev-payment-method-${user.id}`,
			type: "bank_card",
			last4: cardDigits.slice(-4),
			createdAt: now,
			updatedAt: now,
			nextBillingAt: subscription?.nextPayment.date ?? null,
			problemsWithPaymentMethod: false,
		};

		saveDevPaymentMethod(user.id, method);
		queryClient.setQueryData<PaymentMethodResponseDto | null>(PAYMENT_METHOD_QUERY_KEY, method);
		setPaymentMethodActionError(null);
		setDevPaymentMethodDialogOpen(false);
		setDevPaymentMethodForm({
			cardNumber: "",
			expires: "",
			cardholder: "",
			cvc: "",
		});
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

			{!isLoading && !hasLoadError && !paymentMethodError && !activePaymentMethod && (
				<div className="flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3">
						<CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
						<div className="space-y-1">
							<p className="font-medium">Способ оплаты не привязан</p>
							<p className="text-muted-foreground">
								Добавьте способ оплаты, чтобы автопродление подписки сработало без ручных действий.
							</p>
						</div>
					</div>
					<Button size="sm" disabled={addPaymentMethodMutation.isPending} onClick={handleChangePaymentMethod}>
						{addPaymentMethodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
						Добавить способ оплаты
					</Button>
				</div>
			)}

			{!isLoading && !hasLoadError && subscription && isFreeTier && (
				<section className="space-y-5">
					<h1 className="text-3xl font-semibold tracking-normal">Сейчас вы не подписаны</h1>
					<div className="max-w-4xl space-y-4 rounded-lg border p-6 text-base leading-relaxed text-foreground sm:p-8">
						<p>Привяжите свою карту, чтобы начать пользоваться всеми плюшками платформы "Сквозь эйчаров" уже сейчас</p>
						<p>Если вам просто посмотреть, воспользуйтесь пробным периодом или возьмите и отмените подписку</p>
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
								<>
									<p>
										Следующее списание: {nextBillingDate} на {formatPrice(subscription.nextPayment.amount)}
									</p>
									<p>Следующий уровень: {tierButton(nextFullTier ?? subscription.nextTier)}</p>
								</>
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

						<div className="space-y-5">
							<p className="max-w-4xl text-base leading-relaxed text-foreground">
								Если вам нужно изменить или отменить подписку, нажмите на большую кнопку ниже. Подписка останется с вами
								до конца оплаченного периода.
							</p>
							<Button size="lg" className="h-12 px-8 text-base" onClick={() => navigate("/subscription/manage")}>
								Управлять подпиской
							</Button>
						</div>

						<div className="space-y-3">
							{activeTierMarkdown || activeAccessTier?.permissions?.length ? (
								<h2 className="text-xl font-semibold">Вам доступно</h2>
							) : (
								<></>
							)}
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
								""
							)}
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

			<Dialog open={devPaymentMethodDialogOpen} onOpenChange={setDevPaymentMethodDialogOpen}>
				<DialogContent>
					<form className="space-y-5" onSubmit={handleDevPaymentMethodSubmit}>
						<DialogHeader>
							<DialogTitle>Тестовый способ оплаты</DialogTitle>
							<DialogDescription>
								Эта форма доступна только в dev-сборке и не отправляет данные в платёжный сервис.
							</DialogDescription>
						</DialogHeader>

						<div className="grid gap-4">
							<div className="space-y-2">
								<Label htmlFor="dev-card-number">Номер карты</Label>
								<Input
									id="dev-card-number"
									inputMode="numeric"
									autoComplete="cc-number"
									placeholder="4111 1111 1111 1111"
									value={devPaymentMethodForm.cardNumber}
									onChange={event =>
										setDevPaymentMethodForm(prev => ({
											...prev,
											cardNumber: event.target.value,
										}))
									}
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="dev-card-expires">Срок действия</Label>
									<Input
										id="dev-card-expires"
										inputMode="numeric"
										autoComplete="cc-exp"
										placeholder="12/30"
										value={devPaymentMethodForm.expires}
										onChange={event =>
											setDevPaymentMethodForm(prev => ({
												...prev,
												expires: event.target.value,
											}))
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="dev-card-cvc">CVC</Label>
									<Input
										id="dev-card-cvc"
										inputMode="numeric"
										autoComplete="cc-csc"
										placeholder="123"
										value={devPaymentMethodForm.cvc}
										onChange={event =>
											setDevPaymentMethodForm(prev => ({
												...prev,
												cvc: event.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="dev-cardholder">Имя на карте</Label>
								<Input
									id="dev-cardholder"
									autoComplete="cc-name"
									placeholder="IVAN IVANOV"
									value={devPaymentMethodForm.cardholder}
									onChange={event =>
										setDevPaymentMethodForm(prev => ({
											...prev,
											cardholder: event.target.value,
										}))
									}
								/>
							</div>
						</div>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setDevPaymentMethodDialogOpen(false)}>
								Отмена
							</Button>
							<Button type="submit">
								<CreditCard className="h-4 w-4" />
								Сохранить способ оплаты
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
