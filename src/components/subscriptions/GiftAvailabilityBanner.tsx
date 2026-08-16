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
				"flex flex-col gap-3 rounded-lg border border-orange-200 bg-orange-50/80 p-3 text-orange-950 sm:flex-row sm:items-center sm:justify-between sm:px-4 [.dark_&]:!border-orange-500/60 [.dark_&]:!bg-card [.dark_&]:!text-card-foreground",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 [.dark_&]:!bg-orange-500/15 [.dark_&]:!text-orange-300">
					<Gift className="h-5 w-5" />
				</div>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="truncate text-lg font-semibold uppercase leading-tight tracking-normal">{gift.tier.tier}</p>
						{extraGiftCount > 0 && (
							<span className="rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 [.dark_&]:!border-orange-500/60 [.dark_&]:!bg-orange-500/15 [.dark_&]:!text-orange-300">
								+{extraGiftCount}
							</span>
						)}
					</div>
					<p className="text-sm text-orange-700/80 [.dark_&]:!text-orange-300/80">
						Подарок на {gift.durationDays} дн.
						{expiresAt ? `, доступен до ${expiresAt}` : ""}
					</p>
				</div>
			</div>

			<div className="flex flex-wrap gap-2 sm:justify-end">
				{extraGiftCount > 0 && onViewGifts && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="border-orange-200 bg-white/80 text-orange-900 hover:bg-orange-100 hover:text-orange-950 [.dark_&]:!border-orange-500/70 [.dark_&]:!bg-transparent [.dark_&]:!text-orange-300 [.dark_&]:hover:!bg-orange-500/15 [.dark_&]:hover:!text-orange-200"
						onClick={onViewGifts}
					>
						Подарки
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					className="bg-orange-500 text-white hover:bg-orange-600"
					disabled={pending}
					onClick={() => onAccept(gift.id)}
				>
					{pending && <Loader2 className="h-4 w-4 animate-spin" />}
					Активировать
				</Button>
			</div>
		</div>
	);
}
