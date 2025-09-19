import { useMemo } from "react";
import type { UserResponse } from "@/api/usersApi";

export function useUsersById(users?: UserResponse[]) {
	return useMemo(() => {
		const map = new Map<string, UserResponse>();
		(users || []).forEach(u => map.set(u.id, u));
		return map;
	}, [users]);
}
