// src/components/layout/Navbar.tsx
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const linkCls = ({ isActive }: { isActive: boolean }) =>
	`px-3 py-2 rounded-md ${isActive ? "bg-muted font-medium" : "hover:bg-muted"}`;

export function Navbar() {
	const navigate = useNavigate();
	const { user, isAuthenticated, loading, logout } = useAuth();
	const [pending, setPending] = useState(false);

	const handleLogout = async () => {
		try {
			setPending(true);
			await logout(); // серверный /users/logout, кук-ориентированный
		} finally {
			setPending(false);
			navigate("/login", { replace: true });
		}
	};

	return (
		<nav className="flex items-center gap-2 p-4 border-b">
			{isAuthenticated && (
				<>
					<NavLink to="/subjects" className={linkCls}>
						Темы
					</NavLink>
					<NavLink to="/materials" className={linkCls}>
						Материалы
					</NavLink>
					<NavLink to="/tasks" className={linkCls}>
						Задачи
					</NavLink>
					<NavLink to="/hr-connections" className={linkCls}>
						Отклики
					</NavLink>
					{/* только админам */}
					{!loading && user?.role === "admin" && (
						<NavLink to="/users" className={linkCls}>
							Пользователи
						</NavLink>
					)}

					<div className="ml-auto flex items-center gap-3">
						{!loading && user && <span className="text-sm text-muted-foreground">{user.name}</span>}
						<Button variant="outline" onClick={handleLogout} disabled={pending}>
							{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							Выйти
						</Button>
					</div>
				</>
			)}
		</nav>
	);
}
