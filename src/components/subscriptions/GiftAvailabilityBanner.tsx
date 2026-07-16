import { Gift, Loader2 } from "lucide-react";

import type { GiftListItemDto } from "@/api/giftsApi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/pages/Subscription/subscriptionHelpers";

type GiftAvailabilityBannerProps = {
	gift: GiftListItemDto;
	extraGiftCount?: number;
	pending?: boolean;
	className?: string;
	onAccept: (giftId: string) => void;
	onViewGifts?: () => void;
};

export function GiftAvailabilityBanner({
	gift,
	extraGiftCount = 0,
	pending = false,
	className,
	onAccept,
	onViewGifts,
}: GiftAvailabilityBannerProps) {
	const expiresAt = formatDate(gift.expiresAt);

	return (
		<div
			className={cn(
				"flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground sm:min-h-[96px] sm:flex-row sm:items-center sm:justify-between sm:px-8",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center">
					<Gift className="h-6 w-6 text-foreground" />
				</div>
				<div className="min-w-0 space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="truncate text-xl font-semibold uppercase tracking-normal">{gift.tier.tier}</p>
						{extraGiftCount > 0 && (
							<span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
								+{extraGiftCount}
							</span>
						)}
					</div>
					<p className="text-base text-muted-foreground">
						Подарок на {gift.durationDays} дн.
						{expiresAt ? `, доступен до ${expiresAt}` : ""}
					</p>
				</div>
			</div>

			<div className="flex flex-wrap gap-2 sm:justify-end">
				{extraGiftCount > 0 && onViewGifts && (
					<Button type="button" variant="outline" onClick={onViewGifts}>
						Подарки
					</Button>
				)}
				<Button type="button" disabled={pending} onClick={() => onAccept(gift.id)}>
					{pending && <Loader2 className="h-4 w-4 animate-spin" />}
					Активировать
				</Button>
			</div>
		</div>
	);
}
