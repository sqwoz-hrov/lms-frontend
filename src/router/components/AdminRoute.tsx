// src/router/components/AdminRoute.tsx
import { FileQuestion } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
		return (
			<div className="container mx-auto grid min-h-[70vh] place-items-center px-4 py-10">
				<div className="max-w-md space-y-5 text-center">
					<div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
						<FileQuestion className="h-7 w-7 text-muted-foreground" />
					</div>
					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">Ошибка 404</p>
						<h1 className="text-2xl font-semibold tracking-tight">Страница не найдена</h1>
						<p className="text-sm text-muted-foreground">Возможно, ссылка неверна или страница больше недоступна.</p>
					</div>
					<div className="flex flex-wrap justify-center gap-3">
						<Button asChild>
							<Link to="/home">На главную</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/posts">К постам</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}
	return <Outlet />;
}
