import apiClient from "./client";

export type GiftListUserDto = {
	name: string;
	email: string;
	telegramUsername: string;
};

export type GiftListTierDto = {
	id: string;
	tier: string;
	power: number;
	permissions: string[];
	priceRubles: number;
};

export type GiftListItemDto = {
	id: string;
	giftedTo: string;
	giftedBy: string;
	tierId: string;
	activatedAt: string | null;
	durationDays: number;
	expiresAt: string | null;
	user: GiftListUserDto;
	tier: GiftListTierDto;
};

export type GiftListPaginationDto = {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type GetGiftsResponseDto = {
	currentlyActive: GiftListItemDto[];
	used: GiftListItemDto[];
	available: GiftListItemDto[];
	pagination: GiftListPaginationDto;
};

export type GetGiftsParams = {
	email?: string;
	page?: number;
	pageSize?: number;
};

export type GiftAcceptedResponseDto = {
	activateAt: string;
	activeUntil: string;
	giftTierId: string;
};

const GIFTS = "/gifts";
const SUBSCRIPTION_GIFT = "/subscriptions/gift";

export async function listGifts(params: GetGiftsParams = {}): Promise<GetGiftsResponseDto> {
	const res = await apiClient.get<GetGiftsResponseDto>(GIFTS, { params });
	return res.data;
}

export async function acceptGift(giftId: string): Promise<GiftAcceptedResponseDto | null> {
	const res = await apiClient.patch<GiftAcceptedResponseDto | null>(`${SUBSCRIPTION_GIFT}/${giftId}`);
	return res.data;
}

export const GiftsApi = {
	list: listGifts,
	accept: acceptGift,
};
