// src/hooks/useCurrentUser.ts
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/usersApi";

export function useCurrentUser() {
	return useQuery({
		queryKey: ["currentUser"],
		queryFn: getCurrentUser,
		staleTime: 1000 * 60, // кэшируем на минуту
	});
}
