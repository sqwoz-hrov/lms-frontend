import type { SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
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

function formatTierPrice(value: number) {
	return value <= 0 ? "Бесплатно" : `${value.toLocaleString("ru-RU")} ₽ / 30 дней`;
}

export type SubscriptionTierCardProps = {
	tier: SubscriptionTierResponseDto;
	isCurrent?: boolean;
	headerAction?: ReactNode;
	footer?: ReactNode;
	priceLabel?: ReactNode;
	className?: string;
};

export function SubscriptionTierCard(props: SubscriptionTierCardProps) {
	const { tier, isCurrent = false, headerAction, footer, priceLabel, className } = props;
	const markdownDescription = tier.markdown_description?.trim();

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
					<CardDescription>{priceLabel ?? formatTierPrice(tier.price_rubles)}</CardDescription>
				</div>
				{(isCurrent || headerAction) && (
					<CardAction>{headerAction ?? <Badge variant="secondary">Текущий тариф</Badge>}</CardAction>
				)}
			</CardHeader>

			<CardContent className="flex-1">
				{markdownDescription ? (
					<MarkdownRenderer markdown={markdownDescription} mode="preview" />
				) : tier.permissions.length > 0 ? (
					<ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
						{tier.permissions.map(permission => (
							<li key={permission}>{permission}</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-muted-foreground">Без дополнительных ограничений.</p>
				)}
			</CardContent>

			{footer && <CardFooter className="mt-auto justify-end">{footer}</CardFooter>}
		</Card>
	);
}
