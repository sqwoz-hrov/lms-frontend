import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { isAxiosError } from "axios";
import {
	askLogin,
	finishLogin,
	finishRegistration,
	getCurrentUser,
	refresh as refreshSession,
	logout as apiLogout,
	type UserResponse,
} from "@/api/usersApi";

let refreshInFlight: Promise<unknown> | null = null;
function safeRefresh() {
	if (!refreshInFlight) {
		refreshInFlight = refreshSession().finally(() => {
			refreshInFlight = null;
		});
	}
	return refreshInFlight;
}

type UseAuthReturn = {
	user: UserResponse | undefined;
	isAuthenticated: boolean;
	askOtp: (email: string) => Promise<void>;
	finishOtp: (email: string, otpCode: number, options?: { flow?: "login" | "signup" }) => Promise<void>;
	logout: (opts?: { all?: boolean }) => Promise<void>;
	checkAuth: () => Promise<UserResponse | null>;
	loading: boolean;
	userLoading: boolean;
	error: string | null;
	userError: unknown;
};

export function useAuth(): UseAuthReturn {
	const qc = useQueryClient();
	const location = useLocation();

	// Не дергаем /get-me на публичных страницах (логин, signup)
	const isPublicAuthRoute = ["/login", "/signup"].some(path => location.pathname.startsWith(path));

	const [actionLoading, setActionLoading] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	const fetchMeWithAutoRefresh = useCallback(async () => {
		try {
			return await getCurrentUser();
		} catch (e) {
			// Рефреш пытаемся только при 401 и делаем его с "замком"
			if (isAxiosError(e) && e.response?.status === 401) {
				try {
					await safeRefresh();
					return await getCurrentUser();
				} catch {
					// если рефреш не помог — пробрасываем исходную ошибку
					throw e;
				}
			}
			throw e;
		}
	}, []);

	const me = useQuery({
		queryKey: ["currentUser"],
		queryFn: fetchMeWithAutoRefresh,
		staleTime: 60_000,
		retry: false,
		// КЛЮЧЕВОЕ: на /login запрос не запускаем
		enabled: !isPublicAuthRoute,
		// чтобы на фокусе окна/ре-коннекте не сыпались повторные вызовы
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		// по умолчанию при staleTime>0 refetchOnMount=false, оставим как есть
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
		async (email: string, otpCode: number, options?: { flow?: "login" | "signup" }) => {
			try {
				setActionLoading(true);
				setActionError(null);
				if (!Number.isInteger(otpCode) || otpCode < 0) {
					throw new Error("Некорректный одноразовый код");
				}
				if (options?.flow === "signup") {
					await finishRegistration({ email, otpCode });
				} else {
					await finishLogin({ email, otpCode });
				}
				// Ручной рефетч сработает даже если query был disabled на /login
				await qc.invalidateQueries({ queryKey: ["currentUser"] });
				await qc.refetchQueries({ queryKey: ["currentUser"] });
			} catch (e) {
				const fallbackMessage = options?.flow === "signup" ? "Ошибка при завершении регистрации" : "Ошибка при входе";
				setActionError(e instanceof Error ? e.message : fallbackMessage);
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
