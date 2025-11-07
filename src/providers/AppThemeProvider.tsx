// src/providers/AppThemeProvider.tsx
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
import type { ReactNode } from "react";

type AppThemeProviderProps = Omit<ThemeProviderProps, "attribute" | "defaultTheme" | "enableSystem"> & {
	children: ReactNode;
};

export function AppThemeProvider({ children, ...props }: AppThemeProviderProps) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="light"
			enableSystem={false}
			storageKey="lms-ui-theme"
			disableTransitionOnChange
			{...props}
		>
			{children}
		</NextThemesProvider>
	);
}
