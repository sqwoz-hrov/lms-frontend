import { Navigate, Outlet } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

type NonSubscriberRouteProps = {
	redirectTo?: string;
};

/**
 * Blocks subscribers from accessing the wrapped routes.
 * Should be nested inside the main routing tree.
 */
export function NonSubscriberRoute({ redirectTo = "/materials" }: NonSubscriberRouteProps) {
	return (
		<ProtectedRoute>
			<NonSubscriberOnly redirectTo={redirectTo} />
		</ProtectedRoute>
	);
}

function NonSubscriberOnly({ redirectTo }: Required<NonSubscriberRouteProps>) {
	const { user, userLoading } = useAuth();

	if (userLoading) {
		return <p className="text-center p-6">Загрузка...</p>;
	}

	if (!user) {
		// ProtectedRoute handles auth, but keep fallback to avoid rendering issues.
		return <Navigate to="/login" replace />;
	}

	if (user.role === "subscriber") {
		return <Navigate to={redirectTo} replace />;
	}

	return <Outlet />;
}
