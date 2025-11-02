// src/components/layout/Navbar.tsx
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, CreditCard, Loader2, Settings } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

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
					{user?.role !== "subscriber" && (
						<>
							<NavLink to="/tasks" className={linkCls}>
								Задачи
							</NavLink>
							<NavLink to="/hr-connections" className={linkCls}>
								Отклики
							</NavLink>
						</>
					)}
					{/* только админам */}
					{!loading && user?.role === "admin" && (
						<>
							<NavLink to="/subscription-tiers" className={linkCls}>
								Подписки
							</NavLink>
							<NavLink to="/users" className={linkCls}>
								Пользователи
							</NavLink>
						</>
					)}

					<div className="ml-auto flex items-center gap-3">
						{loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
						{!loading && user && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" className="flex items-center gap-1 px-2 py-1 text-sm font-medium">
										<span>{user.name}</span>
										<ChevronDown className="h-4 w-4 text-muted-foreground" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-44">
									<DropdownMenuItem asChild>
										<Link to="/settings" className="flex w-full items-center gap-2">
											<Settings className="h-4 w-4 text-muted-foreground" />
											<span>Настройки</span>
										</Link>
									</DropdownMenuItem>
									{user.role === "subscriber" && (
										<DropdownMenuItem asChild>
											<Link to="/subscription" className="flex w-full items-center gap-2">
												<CreditCard className="h-4 w-4 text-muted-foreground" />
												<span>Подписка</span>
											</Link>
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
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
