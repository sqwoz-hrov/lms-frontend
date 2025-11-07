// api/subscriptionsApi.ts — subscription management endpoints
import apiClient from "./client";

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

export async function downgradeSubscription(data: DowngradeSubscriptionDto): Promise<SubscriptionResponseDto> {
	const res = await apiClient.post<SubscriptionResponseDto>(SUBSCRIPTIONS_DOWNGRADE, data);
	return res.data;
}

export const SubscriptionsApi = {
	downgrade: downgradeSubscription,
};
