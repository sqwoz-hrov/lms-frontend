import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export function Navbar() {
	const navigate = useNavigate();
	const token = localStorage.getItem("token");
	const { data: me, isLoading } = useCurrentUser();

	const handleLogout = () => {
		localStorage.removeItem("token");
		navigate("/login");
	};

	return (
		<nav className="flex items-center gap-4 p-4 border-b">
			{token && (
				<>
					<Link to="/subjects">
						<Button variant="ghost">Темы</Button>
					</Link>
					<Link to="/materials">
						<Button variant="ghost">Материалы</Button>
					</Link>
					<Link to="/tasks">
						<Button variant="ghost">Задачи</Button>
					</Link>
					<Link to="/hr-connections">
						<Button variant="ghost">Отклики</Button>
					</Link>

					{/* Показываем ссылку только для админов */}
					{!isLoading && me?.role === "admin" && (
						<Link to="/users">
							<Button variant="ghost">Пользователи</Button>
						</Link>
					)}

					{/* logout уводим вправо */}
					<Button variant="outline" onClick={handleLogout} className="ml-auto">
						Выйти
					</Button>
				</>
			)}
		</nav>
	);
}
