import { useQuery } from "@tanstack/react-query";
import { SubscriptionTiersApi, type SubscriptionTierResponseDto } from "@/api/subscriptionTiersApi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type SubscriptionTierSelectorProps = {
	value: string[];
	onChange: (next: string[]) => void;
	disabled?: boolean;
	className?: string;
	label?: string;
	helperText?: string;
};

export function SubscriptionTierSelector(props: SubscriptionTierSelectorProps) {
	const { value, onChange, disabled = false, className, label = "Подписочные уровни" } = props;
	const helperText =
		props.helperText ??
		"Выберите уровни подписки, для которых будет доступен материал. Если ни один уровень не выбран, материал будет скрыт.";

	const {
		data: tiers,
		isLoading,
		isError,
		refetch,
	} = useQuery<SubscriptionTierResponseDto[]>({
		queryKey: ["subscription-tiers"],
		queryFn: SubscriptionTiersApi.list,
		staleTime: 60_000,
	});

	const selectedSet = useMemo(() => new Set(value), [value]);

	function toggleTier(id: string) {
		if (disabled) return;
		if (selectedSet.has(id)) {
			onChange(value.filter(tierId => tierId !== id));
		} else {
			onChange([...value, id]);
		}
	}

	return (
		<div className={cn("space-y-3", className)}>
			<div>
				<p className="text-sm font-medium leading-none">{label}</p>
				<p className="text-xs text-muted-foreground mt-1">{helperText}</p>
			</div>

			{isLoading && <div className="text-sm text-muted-foreground">Загрузка тарифов…</div>}

			{isError && (
				<div className="flex items-center gap-2 text-sm text-red-600">
					<span>Не удалось загрузить уровни.</span>
					<Button size="sm" variant="secondary" onClick={() => refetch()} disabled={disabled}>
						Повторить
					</Button>
				</div>
			)}

			{!isLoading && !isError && tiers && tiers.length === 0 && (
				<div className="text-sm text-muted-foreground">Пока нет доступных уровней подписки.</div>
			)}

			{tiers && tiers.length > 0 && (
				<div className="space-y-2">
					{tiers.map(tier => {
						const checked = selectedSet.has(tier.id);
						return (
							<label
								key={tier.id}
								className={cn(
									"flex items-center gap-3 rounded-lg border p-3 transition-colors",
									checked ? "border-primary/60 bg-primary/5" : "hover:bg-muted",
									disabled && "cursor-not-allowed opacity-70",
								)}
							>
								<input
									type="checkbox"
									className="h-4 w-4 accent-primary"
									disabled={disabled}
									checked={checked}
									onChange={() => toggleTier(tier.id)}
								/>
								<div className="flex flex-1 flex-col text-sm">
									<span className="font-medium">{tier.tier}</span>
									<span className="text-xs text-muted-foreground">
										{tier.price_rubles} ₽ · грейд {tier.power}
									</span>
								</div>
								{tier.permissions.length > 0 && (
									<div className="hidden text-[11px] text-muted-foreground sm:block max-w-[220px] text-right leading-tight">
										{tier.permissions.join(", ")}
									</div>
								)}
							</label>
						);
					})}
				</div>
			)}
		</div>
	);
}
