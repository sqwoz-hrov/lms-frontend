import type { PaymentMethodResponseDto } from "@/api/paymentsApi";
import type { GetSubscriptionResponseDto } from "@/api/subscriptionsApi";
import type { SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";

export const TIER_CACHE_TIME_MS = 60 * 60 * 1000;
export const PAYMENT_METHOD_QUERY_KEY = ["subscriptions", "payment-method"] as const;
export const IS_DEV_PAYMENT_METHOD_FORM_ENABLED = import.meta.env.DEV;

export type DisplayTier =
	| SubscriptionTierResponseDto
	| GetSubscriptionResponseDto["currentTier"]
	| GetSubscriptionResponseDto["nextTier"]
	| NonNullable<GetSubscriptionResponseDto["currentGiftTier"]>;

export function formatDate(value?: string | null) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date.toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

export function formatDateTime(value?: string | null) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return date.toLocaleString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatPrice(value?: number | null, currency: "RUB" = "RUB") {
	if (typeof value !== "number") return "0 ₽";

	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(value);
}

export function getTierName(tier?: DisplayTier | null) {
	return tier ? ("name" in tier ? tier.name : tier.tier) : "тариф";
}

export function getDevPaymentMethodStorageKey(userId: string) {
	return `dev-subscription-payment-method:${userId}`;
}

export function readDevPaymentMethod(userId?: string | null): PaymentMethodResponseDto | null {
	if (!IS_DEV_PAYMENT_METHOD_FORM_ENABLED || !userId || typeof window === "undefined") return null;

	const raw = window.localStorage.getItem(getDevPaymentMethodStorageKey(userId));
	if (!raw) return null;

	try {
		return JSON.parse(raw) as PaymentMethodResponseDto;
	} catch {
		window.localStorage.removeItem(getDevPaymentMethodStorageKey(userId));
		return null;
	}
}

export function saveDevPaymentMethod(userId: string, method: PaymentMethodResponseDto) {
	if (!IS_DEV_PAYMENT_METHOD_FORM_ENABLED || typeof window === "undefined") return;
	window.localStorage.setItem(getDevPaymentMethodStorageKey(userId), JSON.stringify(method));
}

export function deleteDevPaymentMethod(userId?: string | null) {
	if (!IS_DEV_PAYMENT_METHOD_FORM_ENABLED || !userId || typeof window === "undefined") return;
	window.localStorage.removeItem(getDevPaymentMethodStorageKey(userId));
}

export function onlyDigits(value: string) {
	return value.replace(/\D/g, "");
}

export function getPaymentMethodLast4(paymentMethod?: PaymentMethodResponseDto | null) {
	if (!paymentMethod) return null;
	if (typeof paymentMethod.last4 === "string") return paymentMethod.last4;

	const last4 = Object.values(paymentMethod.last4 ?? {}).find(value => value);
	return last4 ?? null;
}

export function formatPaymentMethodName(paymentMethod?: PaymentMethodResponseDto | null) {
	if (!paymentMethod) return "Способ оплаты не привязан";

	const last4 = getPaymentMethodLast4(paymentMethod);
	if (paymentMethod.type === "bank_card") {
		return last4 ? `Карта *${last4}` : "Банковская карта";
	}

	if (paymentMethod.type === "sbp") return "СБП";
	if (paymentMethod.type === "sberbank") return "SberPay";
	if (paymentMethod.type === "tinkoff_bank") return "T-Pay";
	if (paymentMethod.type === "yoo_money") return "ЮMoney";

	return paymentMethod.type;
}
