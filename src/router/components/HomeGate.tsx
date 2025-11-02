// src/router/components/HomeGate.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function HomeGate() {
	const { user, userLoading } = useAuth();

	if (userLoading) return <p className="text-center p-6">Загрузка...</p>;
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	const defaultPath = user.role === "subscriber" ? "/materials" : "/tasks";
	return <Navigate to={defaultPath} replace />;
}
