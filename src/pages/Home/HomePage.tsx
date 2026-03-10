import { useAuth } from "@/hooks/useAuth";

export function HomePage() {
    const { user } = useAuth();
	return (
		<div className="container mx-auto max-w-6xl px-4 py-6">
			<h1 className="text-2xl font-semibold tracking-tight">Добро пожаловать на Сквозь Эйчаров-платформу, {user?.name}</h1>
		</div>
	);
}
