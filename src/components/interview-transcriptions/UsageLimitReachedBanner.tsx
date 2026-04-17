import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function UsageLimitReachedBanner({exceededLimits}: { exceededLimits: Array<{ feature: string; period: string; limit: number; name: string }> }) {
    const dailyLimits = exceededLimits.filter(limit => limit.period === "daily");
    const hourlyLimits = exceededLimits.filter(limit => limit.period === "hourly");

    const whenToComeBack = dailyLimits.length > 0 ? "завтра" : hourlyLimits.length > 0 ? "через час" : "позже";

	return (
		<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-4">
					<AlertTriangle className="size-6 shrink-0" />
					<p className="text-sm font-medium">Достигнут лимит использования, заплатите денег чтобы убрать лимиты или вернитесь {whenToComeBack}, если не хотите нам платить :)</p>
				</div>
				<Button asChild size="sm" variant="destructive">
					<Link to="/subscription">Купить подписку</Link>
				</Button>
			</div>
		</div>
	);
}
