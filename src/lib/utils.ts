// src/lib/utils/cn.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Удобная функция для объединения tailwind-классов с приоритетом последних.
 *
 * Пример:
 *   cn("p-2", condition && "bg-red-500", "text-sm")
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
