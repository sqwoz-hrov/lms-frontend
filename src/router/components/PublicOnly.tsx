// src/router/components/PublicOnly.tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PublicOnly({ children, to = "/tasks" }: { children: ReactNode; to?: string }) {
	const { user, userLoading } = useAuth();
	if (userLoading) return <p className="text-center p-6">Загрузка...</p>;
	return user ? <Navigate to={to} replace /> : <>{children}</>;
}
