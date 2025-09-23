// src/hooks/useUsers.ts
import { useQuery } from "@tanstack/react-query";
import { getUsers, type UserResponse } from "@/api/usersApi";

export function useUsers() {
	return useQuery<UserResponse[]>({
		queryKey: ["users"],
		queryFn: getUsers,
		staleTime: 1000 * 60 * 5, // 5 минут
	});
}

export function getUserLabel(u: Partial<Pick<UserResponse, "name" | "email" | "telegram_username">>) {
	if (u.email ?? u.telegram_username) return `${u.name} (${u.email ?? u.telegram_username})}`;
	return u.name!;
}
