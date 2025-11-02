import type { SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ReactNode } from "react";

export type SubscriptionTierCardProps = {
	tier: SubscriptionTierResponseDto;
	isCurrent?: boolean;
	headerAction?: ReactNode;
	footer?: ReactNode;
	className?: string;
};

export function SubscriptionTierCard(props: SubscriptionTierCardProps) {
	const { tier, isCurrent = false, headerAction, footer, className } = props;

	return (
		<Card
			className={cn(
				"transition-colors",
				isCurrent ? "border-primary shadow-md" : "hover:border-muted-foreground/40",
				className,
			)}
		>
			<CardHeader className="items-start gap-2">
				<div>
					<CardTitle className="text-lg">{tier.tier}</CardTitle>
					<CardDescription>{tier.price_rubles} ₽ / мес</CardDescription>
				</div>
				{(isCurrent || headerAction) && (
					<CardAction>{headerAction ?? <Badge variant="secondary">Текущий тариф</Badge>}</CardAction>
				)}
			</CardHeader>

			<CardContent>
				{tier.permissions.length > 0 ? (
					<ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
						{tier.permissions.map(permission => (
							<li key={permission}>{permission}</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-muted-foreground">Без дополнительных ограничений.</p>
				)}
			</CardContent>

			{footer && <CardFooter className="justify-end">{footer}</CardFooter>}
		</Card>
	);
}
