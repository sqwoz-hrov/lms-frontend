// src/router/components/AdminRoute.tsx
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

export function AdminRoute() {
	return (
		<ProtectedRoute>
			<AdminOnly />
		</ProtectedRoute>
	);
}

function AdminOnly() {
	const { user } = useAuth();
	if (!user) return null; // уже проверено ProtectedRoute
	if (user.role !== "admin") {
		return <p className="text-center text-red-500 p-6">Доступ запрещён. Эта страница только для админов.</p>;
	}
	return <Outlet />;
}
