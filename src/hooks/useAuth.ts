// src/hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
	askLogin,
	finishLogin,
	getCurrentUser,
	refresh as refreshSession,
	logout as apiLogout,
	type UserResponse,
} from "@/api/usersApi";

type UseAuthReturn = {
	user: UserResponse | undefined;
	isAuthenticated: boolean;
	askOtp: (email: string) => Promise<void>;
	finishOtp: (email: string, otpCode: number) => Promise<void>;
	logout: (opts?: { all?: boolean }) => Promise<void>;
	checkAuth: () => Promise<UserResponse | null>;
	loading: boolean;
	userLoading: boolean;
	error: string | null;
	userError: unknown;
};

export function useAuth(): UseAuthReturn {
	const qc = useQueryClient();
	const [actionLoading, setActionLoading] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	const fetchMeWithAutoRefresh = useCallback(async () => {
		try {
			return await getCurrentUser();
		} catch (e) {
			try {
				await refreshSession();
				return await getCurrentUser();
			} catch {
				throw e;
			}
		}
	}, []);

	const me = useQuery({
		queryKey: ["currentUser"],
		queryFn: fetchMeWithAutoRefresh,
		staleTime: 60_000,
		retry: false,
	});

	const askOtp = useCallback(async (email: string) => {
		try {
			setActionLoading(true);
			setActionError(null);
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				throw new Error("Некорректный email");
			}
			await askLogin({ email });
		} catch (e) {
			setActionError(e instanceof Error ? e.message : "Ошибка при запросе OTP");
		} finally {
			setActionLoading(false);
		}
	}, []);

	const finishOtp = useCallback(
		async (email: string, otpCode: number) => {
			try {
				setActionLoading(true);
				setActionError(null);
				if (!Number.isInteger(otpCode) || otpCode < 0) {
					throw new Error("Некорректный одноразовый код");
				}
				await finishLogin({ email, otpCode });
				await qc.invalidateQueries({ queryKey: ["currentUser"] });
				await qc.refetchQueries({ queryKey: ["currentUser"] });
			} catch (e) {
				setActionError(e instanceof Error ? e.message : "Ошибка при входе");
			} finally {
				setActionLoading(false);
			}
		},
		[qc],
	);

	const logout = useCallback(
		async (opts?: { all?: boolean }) => {
			try {
				setActionLoading(true);
				setActionError(null);
				await apiLogout({ all: opts?.all ?? false });
			} catch (e) {
				setActionError(e instanceof Error ? e.message : "Ошибка при выходе");
			} finally {
				await qc.invalidateQueries();
				qc.clear();
				setActionLoading(false);
			}
		},
		[qc],
	);

	const checkAuth = useCallback(async (): Promise<UserResponse | null> => {
		try {
			const user = await me.refetch();
			return user.data ?? null;
		} catch {
			return null;
		}
	}, [me]);

	const value = useMemo<UseAuthReturn>(
		() => ({
			user: me.data,
			isAuthenticated: Boolean(me.data?.id),
			askOtp,
			finishOtp,
			logout,
			checkAuth,
			loading: actionLoading || me.isFetching || me.isLoading,
			userLoading: me.isFetching || me.isLoading,
			error: actionError,
			userError: me.error,
		}),
		[me.data, me.isFetching, me.isLoading, me.error, askOtp, finishOtp, logout, checkAuth, actionLoading, actionError],
	);

	return value;
}
