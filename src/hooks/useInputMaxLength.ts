import { useMemo, type ComponentProps } from "react";

type InputMaxLengthValue = string | null | undefined;
type InputLikeProps = Pick<ComponentProps<"input">, "aria-invalid"> & {
	"data-maxlength-exceeded"?: string;
};

export type InputMaxLengthResult = {
	length: number;
	maxLength?: number;
	isExceeded: boolean;
	remaining: number | null;
	overBy: number;
	counterText: string | null;
	inputProps: InputLikeProps;
};

/**
 * Tracks how close a text value is to the provided limit and exposes
 * convenience props that can be spread onto an input element.
 */
export function useInputMaxLength(value: InputMaxLengthValue, maxLength?: number): InputMaxLengthResult {
	return useMemo(() => {
		const normalizedMax = typeof maxLength === "number" && maxLength > 0 ? maxLength : undefined;
		const length = value?.length ?? 0;

		if (!normalizedMax) {
			return {
				length,
				maxLength: undefined,
				isExceeded: false,
				remaining: null,
				overBy: 0,
				counterText: null,
				inputProps: {},
			};
		}

		const difference = normalizedMax - length;
		const isExceeded = difference < 0;

		return {
			length,
			maxLength: normalizedMax,
			isExceeded,
			remaining: Math.max(difference, 0),
			overBy: isExceeded ? Math.abs(difference) : 0,
			counterText: `${length}/${normalizedMax}`,
			inputProps: isExceeded ? { "aria-invalid": true, "data-maxlength-exceeded": "true" } : {},
		};
	}, [value, maxLength]);
}
