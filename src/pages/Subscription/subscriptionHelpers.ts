import type { PaymentMethodResponseDto } from "@/api/paymentsApi";
import type { GiftListItemDto } from "@/api/giftsApi";
import type { GetSubscriptionResponseDto } from "@/api/subscriptionsApi";
import type { SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { isAxiosError } from "axios";

export const TIER_CACHE_TIME_MS = 60 * 60 * 1000;
export const PAYMENT_METHOD_QUERY_KEY = ["subscriptions", "payment-method"] as const;
export const LOWER_TIER_GIFT_MESSAGE =
	"Этот подарок ниже уровнем, чем ваша текущая подписка, поэтому его нельзя активировать.";

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

export function formatSubscriptionPrice(value?: number | null, currency: "RUB" = "RUB") {
	if (typeof value === "number" && value <= 0) return "Бесплатно";
	return formatPrice(value, currency);
}

export function formatSubscriptionPeriodPrice(value?: number | null, period = "в месяц") {
	const price = formatSubscriptionPrice(value);
	return price === "Бесплатно" ? price : `${price} ${period}`;
}

export function getTierName(tier?: DisplayTier | null) {
	return tier ? ("name" in tier ? tier.name : tier.tier) : "тариф";
}

export function getTierPower(tier?: DisplayTier | null) {
	return typeof tier?.power === "number" ? tier.power : null;
}

export function canActivateTierPowerWithCurrentPower(tierPower: number, currentPower?: number | null) {
	return typeof currentPower !== "number" || tierPower >= currentPower;
}

export function canActivateGiftWithCurrentPower(gift: GiftListItemDto, currentPower?: number | null) {
	return canActivateTierPowerWithCurrentPower(gift.tier.power, currentPower);
}

export function getBestApplicableGift(gifts: GiftListItemDto[], currentPower?: number | null) {
	const [bestGiftCandidate] = [...gifts].sort((a, b) => {
		const powerDiff = b.tier.power - a.tier.power;
		if (powerDiff !== 0) return powerDiff;

		const durationDiff = b.durationDays - a.durationDays;
		if (durationDiff !== 0) return durationDiff;

		return a.tier.tier.localeCompare(b.tier.tier, "ru");
	});
	const bestGift =
		bestGiftCandidate && canActivateGiftWithCurrentPower(bestGiftCandidate, currentPower)
			? bestGiftCandidate
			: undefined;

	return {
		bestGift,
		applicableGiftCount: bestGift ? gifts.length : 0,
		extraGiftCount: bestGift ? Math.max(0, gifts.length - 1) : 0,
	};
}

export function getGiftActivationErrorMessage(error: unknown) {
	if (isAxiosError<{ description?: string; message?: string | string[] }>(error)) {
		const message = error.response?.data?.description ?? error.response?.data?.message;
		const text = Array.isArray(message) ? message.join(" ") : message;

		if (text?.includes("Cannot accept a lower tier gift")) {
			return LOWER_TIER_GIFT_MESSAGE;
		}

		if (text?.includes("Already have an active gifted subscription")) {
			return "У вас уже активен подарок. Новый подарок можно будет активировать после завершения текущего.";
		}

		if (text?.includes("Gift already activated")) {
			return "Этот подарок уже был активирован.";
		}
	}

	return "Попробуйте ещё раз чуть позже.";
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
