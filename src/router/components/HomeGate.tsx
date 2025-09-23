// src/router/components/HomeGate.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function HomeGate() {
	const { user, userLoading } = useAuth();

	if (userLoading) return <p className="text-center p-6">Загрузка...</p>;
	return user ? <Navigate to="/tasks" replace /> : <Navigate to="/login" replace />;
}
