// src/api/usersApi.ts
import apiClient from "./client";

export type AskLoginDto = {
	email: string;
};

export type FinishLoginDto = {
	email: string;
	otpCode: number;
};

export type SignupDto = {
	role: "admin" | "user";
	name: string;
	email: string;
	telegram_username: string;
};

export type UserResponse = {
	id: string;
	role: "admin" | "user";
	name: string;
	email: string;
	telegram_id?: number;
	telegram_username: string;
};

type OkWithTtls = {
	ok: true;
	accessTtlMs?: number;
	refreshTtlMs?: number;
};

const USERS = "/users";

export async function askLogin(data: AskLoginDto): Promise<void> {
	await apiClient.post(`${USERS}/login`, data);
}

export async function finishLogin(data: FinishLoginDto): Promise<OkWithTtls> {
	const res = await apiClient.post<OkWithTtls>(`${USERS}/login/finish`, data, {
		withCredentials: true,
	});
	return res.data;
}

export async function refresh(): Promise<OkWithTtls> {
	const res = await apiClient.post<OkWithTtls>(`${USERS}/refresh`, undefined, {
		withCredentials: true,
	});
	return res.data;
}

export async function logout(options?: { all?: boolean }): Promise<{ ok: true }> {
	const res = await apiClient.post<{ ok: true }>(
		`${USERS}/logout`,
		{ all: options?.all ?? false },
		{ withCredentials: true },
	);
	return res.data;
}

export async function signup(data: SignupDto): Promise<UserResponse> {
	const res = await apiClient.post<UserResponse>(`${USERS}/signup`, data, {
		withCredentials: true,
	});
	return res.data;
}

export async function getCurrentUser(): Promise<UserResponse> {
	const res = await apiClient.get<UserResponse>(`${USERS}/get-me`, {
		withCredentials: true,
	});
	return res.data;
}

export async function getUsers(): Promise<UserResponse[]> {
	const res = await apiClient.get<UserResponse[]>(`${USERS}`, {
		withCredentials: true,
	});
	return res.data;
}

export const AuthApi = {
	askLogin,
	finishLogin,
	refresh,
	logout,
	signup,
	getCurrentUser,
	getUsers,
};
