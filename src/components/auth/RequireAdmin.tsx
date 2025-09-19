// src/components/auth/RequireAdmin.tsx
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { JSX } from "react";

export function RequireAdmin({ children }: { children: JSX.Element }) {
	const { data, isLoading } = useCurrentUser();

	if (isLoading) return <p className="text-center p-6">Загрузка...</p>;
	if (!data) return <Navigate to="/login" replace />;

	if (data.role !== "admin") {
		return <p className="text-center text-red-500 p-6">Доступ запрещён. Эта страница только для админов.</p>;
	}

	return children;
}
