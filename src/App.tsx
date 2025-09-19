import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { AppRoutes } from "@/router/routes";

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter basename="/lms">
				<AppRoutes />
			</BrowserRouter>
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
