// src/router/components/PublicOnly.tsx
import { useEffect, useRef, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PublicOnly({ children, to = "/tasks" }: { children: ReactNode; to?: string }) {
	const { user, userLoading, checkAuth } = useAuth();
	const hasRequestedAuth = useRef(false);

	useEffect(() => {
		if (user || userLoading || hasRequestedAuth.current) {
			return;
		}
		hasRequestedAuth.current = true;
		void checkAuth();
	}, [checkAuth, user, userLoading]);

	if (userLoading) return <p className="text-center p-6">Загрузка...</p>;
	return user ? <Navigate to={to} replace /> : <>{children}</>;
}
