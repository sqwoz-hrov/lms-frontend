import type { PostResponseDto } from "@/api/postsApi";
import type { SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import type { UserResponse } from "@/api/usersApi";

export function isPaidOrGiftedSubscriber(user?: UserResponse): boolean {
	return user?.role === "subscriber" && (user.subscription_tier?.price_rubles ?? 0) > 0;
}

export function isPostLockedForHigherTier(
	post: PostResponseDto,
	user: UserResponse | undefined,
	tiers: SubscriptionTierResponseDto[],
): boolean {
	if (!post.locked_preview || !post.minimal_tier_id || user?.role !== "subscriber") {
		return false;
	}

	const minimumTier = tiers.find(tier => tier.id === post.minimal_tier_id);
	const currentTierPower = user.subscription_tier?.power;

	if (minimumTier && typeof currentTierPower === "number") {
		return minimumTier.power > currentTierPower;
	}

	// A subscriber only receives locked_preview when the backend has already
	// compared the effective tier (including an active gift) with the post tier.
	return true;
}

export function getLockedPostAccessMessage(
	post: PostResponseDto,
	user: UserResponse | undefined,
	tiers: SubscriptionTierResponseDto[],
): string {
	if (isPaidOrGiftedSubscriber(user)) {
		const minimumTier = tiers.find(tier => tier.id === post.minimal_tier_id);
		if (minimumTier) {
			return `Контент доступен с подписки уровня «${minimumTier.tier}» и выше.`;
		}
	}

	return "Контент доступен только подписчикам.";
}
