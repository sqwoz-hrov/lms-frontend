import type { ComponentProps, ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { VideoPlayer } from "./VideoPlayer";

export type BackendVideoPhase = string | undefined;

export const normalizeVideoPhase = (
	phase?: BackendVideoPhase,
	hasSource?: boolean,
): NonNullable<ComponentProps<typeof VideoPlayer>["phase"]> => {
	switch (phase) {
		case "receiving":
		case "hashing":
		case "uploading_s3":
		case "completed":
		case "failed":
			return phase;
		case "processing":
			return "uploading_s3";
		default:
			return hasSource ? "completed" : "receiving";
	}
};

type VideoProcessingPreviewProps = {
	title?: string;
	description?: string;
	filename?: string | null;
	src?: string | null;
	mimeType?: string | null;
	phase?: BackendVideoPhase;
	actions?: ReactNode;
	helperText?: ReactNode;
	helperTextTone?: "default" | "error";
	variant?: "panel" | "plain";
	className?: string;
};

export function VideoProcessingPreview({
	title,
	description,
	filename,
	src,
	mimeType = "video/mp4",
	phase,
	actions,
	helperText,
	helperTextTone = "default",
	variant = "panel",
	className,
}: VideoProcessingPreviewProps) {
	const normalizedPhase = normalizeVideoPhase(phase, Boolean(src));
	const hasHeader = Boolean(title || description || filename || actions);

	return (
		<div className={cn(variant === "panel" ? "space-y-4 rounded-lg border bg-muted/40 p-4" : "space-y-3", className)}>
			{hasHeader && (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						{title ? <p className="text-sm font-medium">{title}</p> : null}
						{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
						{filename ? (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<CheckCircle2 className="size-3.5 text-green-500" />
								<span className="font-medium text-foreground truncate">{filename}</span>
							</div>
						) : null}
					</div>
					{actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
				</div>
			)}

			<VideoPlayer
				src={src ?? undefined}
				type={mimeType}
				title={filename ?? title ?? "Видео"}
				phase={normalizedPhase}
			/>

			{helperText ? (
				<p className={cn("text-xs", helperTextTone === "error" ? "text-destructive" : "text-muted-foreground")}>
					{helperText}
				</p>
			) : null}
		</div>
	);
}
