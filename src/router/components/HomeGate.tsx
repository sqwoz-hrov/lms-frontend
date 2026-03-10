// src/router/components/HomeGate.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NotLoggedInHomePage } from "@/pages/Home/NotLoggedInHomePage";

export function HomeGate() {
	const { user, userLoading } = useAuth();

	if (userLoading) return <p className="text-center p-6">Загрузка...</p>;
	if (!user) {
		return <NotLoggedInHomePage />;
	}

	const preferredHomepage = user.settings?.homepage;

	const defaultPath =
		preferredHomepage === "posts"
			? "/posts"
			: preferredHomepage === "home"
				? "/home"
				: preferredHomepage === "transcriptions"
					? user.role === "admin"
						? "/interview-transcriptions"
						: "/interviews/progress-view"
					: user.role === "subscriber"
						? "/materials"
						: "/tasks";
	return <Navigate to={defaultPath} replace />;
}
