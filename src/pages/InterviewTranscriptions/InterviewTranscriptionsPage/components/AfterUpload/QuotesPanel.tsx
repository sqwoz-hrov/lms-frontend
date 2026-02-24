import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

export type QuotesPanelProps = {
	quotes: string[];
	activeIndex: number;
	onNext: () => void;
	onPrev: () => void;
};

export function QuotesPanel({ quotes, activeIndex, onNext, onPrev }: QuotesPanelProps) {
	const activeQuote = quotes[activeIndex] ?? "";

	return (
		<Card className="border-0 bg-muted/40 shadow-xl">
			<CardHeader className="flex items-center justify-center pb-3">
				<div className="flex items-center gap-2">
					<Loader2 className="size-5 animate-spin text-primary/80" aria-hidden="true" />
					<CardTitle className="text-lg">Анализируем интервью</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="flex min-h-[260px] items-center gap-3 pt-0">
				<div className="flex w-full items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						className="h-12 w-12 transition hover:-translate-y-0.5 focus-visible:ring-0 focus-visible:ring-offset-0"
						onClick={onPrev}
						aria-label="Предыдущая цитата"
					>
						<ChevronLeft className="size-5" />
					</Button>
					<div className="flex-1 rounded-2xl bg-transparent px-6 py-6 text-center shadow-inner">
						<MarkdownRenderer markdown={activeQuote} mode="full" className="bg-transparent text-sm leading-relaxed" />
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-12 w-12 transition hover:-translate-y-0.5 focus-visible:ring-0 focus-visible:ring-offset-0"
						onClick={onNext}
						aria-label="Следующая цитата"
					>
						<ChevronRight className="size-5" />
					</Button>
				</div>
			</CardContent>
			<div className="mt-auto flex items-center justify-center pb-2">
				<div className="px-4 py-1 text-xs font-medium text-slate-200">
					{activeIndex + 1} / {quotes.length}
				</div>
			</div>
		</Card>
	);
}
