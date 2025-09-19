import { Card, CardContent } from "@/components/ui/card";

export function EmptyColumn() {
	return (
		<Card className="border-dashed">
			<CardContent className="py-6 text-center text-xs text-muted-foreground">Перетащите задачи сюда</CardContent>
		</Card>
	);
}
