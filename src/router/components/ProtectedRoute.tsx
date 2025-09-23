// src/router/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

type ProtectedRouteProps = {
	loginPath?: string;
	children?: ReactNode; // <-- добавили
};

function buildNext(location: ReturnType<typeof useLocation>) {
	return encodeURIComponent(location.pathname + location.search + location.hash);
}

export function ProtectedRoute({ loginPath = "/login", children }: ProtectedRouteProps) {
	const { user, userLoading } = useAuth();
	const location = useLocation();

	if (userLoading) return <p className="text-center p-6">Загрузка...</p>;

	if (!user) {
		const next = buildNext(location);
		return <Navigate to={`${loginPath}?next=${next}`} replace />;
	}

	// поддерживаем оба варианта: с children и через Outlet
	return children ? <>{children}</> : <Outlet />;
}
