// api/subscriptionsApi.ts — subscription management endpoints
import apiClient from "./client";

export type SubscriptionTierSummaryDto = {
	id: string;
	name: string;
	permissions: string[];
	power?: number;
};

export type CurrentSubscriptionTierDto = SubscriptionTierSummaryDto & {
	until: string | null;
};

export type GiftSubscriptionTierDto = SubscriptionTierSummaryDto & {
	until: string;
};

export type NextPaymentDto = {
	amount: number;
	date: string | null;
};

export type GetSubscriptionResponseDto = {
	currentGiftTier: GiftSubscriptionTierDto | null;
	currentTier: CurrentSubscriptionTierDto;
	nextTier: SubscriptionTierSummaryDto;
	nextPayment: NextPaymentDto;
};

export type SubscriptionResponseDto = {
	id: string;
	userId: string;
	subscriptionTierId: string;
	priceOnPurchaseRubles: number;
	isGifted: boolean;
	gracePeriodSize: number;
	billingPeriodDays: number;
	paymentMethodId: Record<string, unknown> | null;
	currentPeriodEnd: string | null;
	lastBillingAttempt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type DowngradeSubscriptionDto = {
	subscriptionTierId: string;
};

const SUBSCRIPTIONS_DOWNGRADE = "/subscriptions/downgrade";
const SUBSCRIPTION = "/subscription";

export async function getCurrentSubscription(): Promise<GetSubscriptionResponseDto> {
	const res = await apiClient.get<GetSubscriptionResponseDto>(SUBSCRIPTION);
	return res.data;
}

export async function downgradeSubscription(data: DowngradeSubscriptionDto): Promise<SubscriptionResponseDto> {
	const res = await apiClient.post<SubscriptionResponseDto>(SUBSCRIPTIONS_DOWNGRADE, data);
	return res.data;
}

export const SubscriptionsApi = {
	getCurrent: getCurrentSubscription,
	downgrade: downgradeSubscription,
};
