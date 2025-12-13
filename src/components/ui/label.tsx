"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

const REQUIRED_LABEL_TEXT = "Обязательно";

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
	required?: boolean;
	requiredText?: string;
};

function Label({ className, children, required = false, requiredText = REQUIRED_LABEL_TEXT, ...props }: LabelProps) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			data-required={required || undefined}
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{children}
			{required ? (
				<span className="inline-flex items-center gap-1 text-destructive font-semibold">
					<span aria-hidden="true">*</span>
					<span className="sr-only">{requiredText}</span>
				</span>
			) : null}
		</LabelPrimitive.Root>
	);
}

export { Label };
