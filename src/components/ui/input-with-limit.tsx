import * as React from "react";

import { Input } from "./input";
import { cn } from "@/lib/utils";
import { useInputMaxLength, type InputMaxLengthResult } from "@/hooks/useInputMaxLength";

type ExceededMessage = React.ReactNode | ((state: InputMaxLengthResult) => React.ReactNode);

export type InputWithLimitProps = React.ComponentProps<typeof Input> & {
	textValue?: string | null | undefined;
	maxLength?: number;
	errorMessage?: React.ReactNode;
	showCounter?: boolean;
	counterClassName?: string;
	wrapperClassName?: string;
	exceededMessage?: ExceededMessage;
};

/**
 * Input wrapper that shows a live counter and validation message when
 * the provided text value exceeds the max length.
 */
export const InputWithLimit = React.forwardRef<HTMLInputElement, InputWithLimitProps>(
	(
		{
			textValue,
			maxLength,
			errorMessage,
			showCounter = true,
			counterClassName,
			wrapperClassName,
			className,
			exceededMessage,
			...props
		},
		ref,
	) => {
		const lengthState = useInputMaxLength(textValue, maxLength);
		const isInvalid = Boolean(props["aria-invalid"]) || lengthState.isExceeded || Boolean(errorMessage);

		const resolvedExceeded = React.useMemo(() => {
			if (!lengthState.isExceeded) return null;
			const message = typeof exceededMessage === "function" ? exceededMessage(lengthState) : exceededMessage;
			if (message) return message;
			if (!lengthState.maxLength) return null;
			return `Превышен лимит ${lengthState.maxLength} символов. Удалите лишние ${lengthState.overBy}.`;
		}, [exceededMessage, lengthState]);

		return (
			<div className={cn("space-y-1.5", wrapperClassName)}>
				<Input
					ref={ref}
					className={className}
					{...props}
					{...lengthState.inputProps}
					aria-invalid={isInvalid || undefined}
				/>
				{showCounter && lengthState.counterText && (
					<p
						className={cn(
							"text-xs text-muted-foreground text-right",
							lengthState.isExceeded && "text-red-600 font-medium",
							counterClassName,
						)}
					>
						{lengthState.counterText}
					</p>
				)}
				{resolvedExceeded ? (
					typeof resolvedExceeded === "string" ? (
						<p className="text-xs text-red-600">{resolvedExceeded}</p>
					) : (
						resolvedExceeded
					)
				) : (
					errorMessage &&
					(typeof errorMessage === "string" ? <p className="text-xs text-red-600">{errorMessage}</p> : errorMessage)
				)}
			</div>
		);
	},
);
InputWithLimit.displayName = "InputWithLimit";
