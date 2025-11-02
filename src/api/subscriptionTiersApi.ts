// api/subscriptionTiersApi.ts — wrapper for subscription tier endpoints
import apiClient from "./client";

export type SubscriptionTierResponseDto = {
	id: string;
	tier: string;
	price_rubles: number;
	power: number;
	permissions: string[];
};

export type CreateSubscriptionTierDto = {
	tier: string;
	price_rubles: number;
	power: number;
	permissions: string[];
};

export type UpdateSubscriptionTierDto = {
	id: string;
	tier?: string;
	price_rubles?: number;
	power?: number;
	permissions?: string[];
};

export type DeleteSubscriptionTierDto = {
	id: string;
};

const SUBSCRIPTION_TIERS = "/subscription-tiers";

export async function listSubscriptionTiers(): Promise<SubscriptionTierResponseDto[]> {
	const res = await apiClient.get<SubscriptionTierResponseDto[]>(SUBSCRIPTION_TIERS);
	return res.data;
}

export async function createSubscriptionTier(data: CreateSubscriptionTierDto): Promise<SubscriptionTierResponseDto> {
	const res = await apiClient.post<SubscriptionTierResponseDto>(SUBSCRIPTION_TIERS, data);
	return res.data;
}

export async function updateSubscriptionTier(data: UpdateSubscriptionTierDto): Promise<SubscriptionTierResponseDto> {
	const res = await apiClient.put<SubscriptionTierResponseDto>(SUBSCRIPTION_TIERS, data);
	return res.data;
}

export async function deleteSubscriptionTier(data: DeleteSubscriptionTierDto): Promise<SubscriptionTierResponseDto> {
	const res = await apiClient.delete<SubscriptionTierResponseDto>(SUBSCRIPTION_TIERS, { data });
	return res.data;
}

export async function getSubscriptionTierById(id: string): Promise<SubscriptionTierResponseDto | null> {
	const all = await listSubscriptionTiers();
	return all.find(tier => tier.id === id) ?? null;
}

export const SubscriptionTiersApi = {
	list: listSubscriptionTiers,
	create: createSubscriptionTier,
	update: updateSubscriptionTier,
	delete: deleteSubscriptionTier,
	getById: getSubscriptionTierById,
};
