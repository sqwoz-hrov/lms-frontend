import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getUsers, type UserResponse, type UserRole } from "@/api/usersApi";

type UsersLoaderContextValue = UseQueryResult<UserResponse[]> & {
	users: UserResponse[];
	roles?: UserRole[];
};

const UsersLoaderContext = createContext<UsersLoaderContextValue | null>(null);

type UsersLoaderProps = {
	children: ReactNode;
	roles?: UserRole[];
	enabled?: boolean;
};

export function UsersLoader({ children, roles, enabled = true }: UsersLoaderProps) {
	const normalizedRoles = useMemo(() => {
		if (!roles?.length) return undefined;
		return [...roles].sort();
	}, [roles]);

	const query = useQuery<UserResponse[]>({
		queryKey: ["users", { roles: normalizedRoles }],
		queryFn: () => getUsers({ roles: normalizedRoles }),
		enabled,
		staleTime: 60_000,
	});

	const value: UsersLoaderContextValue = {
		...query,
		users: query.data ?? [],
		roles: normalizedRoles,
	};

	return <UsersLoaderContext.Provider value={value}>{children}</UsersLoaderContext.Provider>;
}

export function useUsersLoader() {
	const value = useContext(UsersLoaderContext);
	if (!value) {
		throw new Error("useUsersLoader must be used within UsersLoader");
	}
	return value;
}
