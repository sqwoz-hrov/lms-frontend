import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useState } from "react";
import type { PlayerMode } from "@/pages/InterviewTranscriptions/InterviewTranscriptionsPage/InterviewTranscriptionDetailsPage";

export type ErrorNavigatorProps = {
	/** Ordered list of SRT line IDs that have errors */
	errorLineIds: number[];
	/**
	 * Current player mode – determines where the navigator is positioned:
	 * - `"floating"` → fixed to the right side of the viewport
	 * - `"sticky"`   → fixed to the bottom center of the viewport
	 */
	playerMode: PlayerMode;
	/** Whether the navigator should be visible (typically when the transcript is in view) */
	visible: boolean;
};

/**
 * Computes the top offset of the "free" viewport area — i.e. the part not
 * occluded by the sticky video player. In floating mode the entire viewport
 * is free, so the offset is 0.
 */
function getFreeViewportTop(playerMode: PlayerMode): number {
	if (playerMode !== "sticky") return 0;
	const playerEl = document.querySelector("[data-video-player-wrapper]");
	if (!playerEl) return 0;
	const rect = playerEl.getBoundingClientRect();
	// Only count it if it's actually fixed at the top (rect.top ≈ 0)
	if (rect.top > 10) return 0;
	return rect.bottom;
}

/**
 * Computes the visible "free" zone where transcript content is readable:
 * the intersection of the viewport (below the sticky player) and the
 * transcript container's bounding rect. Returns { top, bottom } in
 * viewport-relative pixels.
 */
function getFreeZone(playerMode: PlayerMode): { top: number; bottom: number } {
	const vpTop = getFreeViewportTop(playerMode);
	const vpBottom = window.innerHeight;

	const transcriptEl = document.querySelector("[data-transcript-view]");
	if (!transcriptEl) return { top: vpTop, bottom: vpBottom };

	const tRect = transcriptEl.getBoundingClientRect();
	// Intersect the viewport free zone with the transcript element bounds
	return {
		top: Math.max(vpTop, tRect.top),
		bottom: Math.min(vpBottom, tRect.bottom),
	};
}

/**
 * Scrolls an element so that it is vertically centred within the free
 * zone — the visible part of the TranscriptView below the sticky player
 * (in sticky mode) or the full transcript area (in floating mode).
 */
function scrollToCenter(el: Element, playerMode: PlayerMode) {
	const zone = getFreeZone(playerMode);
	const zoneHeight = zone.bottom - zone.top;
	if (zoneHeight <= 0) {
		// Fallback: just bring it into view
		el.scrollIntoView({ behavior: "smooth", block: "center" });
		return;
	}
	const elRect = el.getBoundingClientRect();
	const elCenterInZone = elRect.top + elRect.height / 2 - zone.top;
	const delta = elCenterInZone - zoneHeight / 2;
	window.scrollBy({ top: delta, behavior: "smooth" });
}

/**
 * A fixed-position pair of red up/down arrows that let the user jump between
 * transcript lines that contain errors. Position depends on `playerMode`.
 *
 * Each error line is expected to have a DOM element with
 * `data-line-id="{lineId}"` so the navigator can scroll to it.
 */
export function ErrorNavigator({ errorLineIds, playerMode, visible }: ErrorNavigatorProps) {
	const [currentIdx, setCurrentIdx] = useState(-1);

	const total = errorLineIds.length;

	const scrollToLine = useCallback(
		(idx: number) => {
			const lineId = errorLineIds[idx];
			if (lineId == null) return;
			const el = document.querySelector(`[data-line-id="${lineId}"]`);
			if (el) {
				scrollToCenter(el, playerMode);
				// Brief highlight flash
				el.classList.add("ring-2", "ring-destructive/60");
				setTimeout(() => el.classList.remove("ring-2", "ring-destructive/60"), 1200);
			}
		},
		[errorLineIds, playerMode],
	);

	const goNext = useCallback(() => {
		if (total === 0) return;
		const next = currentIdx + 1 >= total ? 0 : currentIdx + 1;
		setCurrentIdx(next);
		scrollToLine(next);
	}, [currentIdx, total, scrollToLine]);

	const goPrev = useCallback(() => {
		if (total === 0) return;
		const prev = currentIdx - 1 < 0 ? total - 1 : currentIdx - 1;
		setCurrentIdx(prev);
		scrollToLine(prev);
	}, [currentIdx, total, scrollToLine]);

	if (!visible || total === 0) return null;

	const counterLabel = currentIdx >= 0 ? `${currentIdx + 1}/${total}` : `${total}`;

	// Floating mode: vertical pill on the right, label above the container
	if (playerMode === "floating") {
		return (
			<div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1.5 transition-all duration-300 animate-in fade-in slide-in-from-right-2">
				{/* Label sits above the pill */}
				<span className="text-[9px] font-medium text-muted-foreground select-none tracking-wide uppercase">
					Ошибки
				</span>

				{/* Slim vertical pill */}
				<div className="flex flex-col items-center gap-1.5 rounded-full border bg-background/95 backdrop-blur-sm shadow-lg px-1.5 py-2">
					<button
						type="button"
						onClick={goPrev}
						title="Предыдущая ошибка"
						className="flex items-center justify-center size-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
					>
						<ChevronUp className="size-5" />
					</button>

					<span className="text-[11px] font-semibold tabular-nums text-destructive select-none">
						{counterLabel}
					</span>

					<button
						type="button"
						onClick={goNext}
						title="Следующая ошибка"
						className="flex items-center justify-center size-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
					>
						<ChevronDown className="size-5" />
					</button>
				</div>
			</div>
		);
	}

	// Sticky mode: horizontal pill at the bottom center
	return (
		<div
			className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border bg-background/95 backdrop-blur-sm shadow-lg px-3 py-1.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
		>
			<button
				type="button"
				onClick={goPrev}
				title="Предыдущая ошибка"
				className="flex items-center justify-center size-8 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
			>
				<ChevronUp className="size-4" />
			</button>

			<div className="flex flex-col items-center gap-0 select-none">
				<span className="text-[10px] text-muted-foreground leading-tight">Навигация по ошибкам</span>
				<span className="text-[11px] font-semibold tabular-nums text-destructive leading-tight">
					{counterLabel}
				</span>
			</div>

			<button
				type="button"
				onClick={goNext}
				title="Следующая ошибка"
				className="flex items-center justify-center size-8 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
			>
				<ChevronDown className="size-4" />
			</button>
		</div>
	);
}
