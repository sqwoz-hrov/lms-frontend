import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppRoutes } from "@/router/routes";
import { AppThemeProvider } from "@/providers/AppThemeProvider";
import { Toaster } from "@/components/ui/sonner";

export function App() {
	const basename =
		((import.meta.env.VITE_FRONTEND_URL_PREFIX && import.meta.env.VITE_FRONTEND_URL_PREFIX.trim()) as string) || "/lms";

	return (
		<QueryClientProvider client={queryClient}>
			<AppThemeProvider>
				<BrowserRouter basename={basename}>
					<AppRoutes />
				</BrowserRouter>
				<Toaster />
			</AppThemeProvider>
		</QueryClientProvider>
	);
}
