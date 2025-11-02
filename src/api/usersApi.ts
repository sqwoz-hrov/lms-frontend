// src/api/usersApi.ts
import apiClient from "./client";
import type { SubscriptionTierResponseDto } from "./subscriptionTiersApi";

export type AskLoginDto = {
	email: string;
};

export type FinishLoginDto = {
	email: string;
	otpCode: number;
};

export type FinishRegistrationDto = {
	email: string;
	otpCode: number;
};

export type PublicSignupDto = {
	name: string;
	email: string;
	telegram_username: string;
};

export type SignupDto = {
	role: "admin" | "user";
	name: string;
	email: string;
	telegram_username: string;
};

export type UserRole = "admin" | "user" | "subscriber";

export type UserResponse = {
	id: string;
	role: UserRole;
	name: string;
	email: string;
	telegram_id?: number;
	telegram_username: string;
	subscription_tier_id?: string | null;
	subscription_tier?: SubscriptionTierResponseDto | null;
	finished_registration?: boolean;
	active_until?: string | null;
	is_billable?: boolean;
	is_archived?: boolean;
};

type OkWithTtls = {
	ok: true;
	accessTtlMs?: number;
	refreshTtlMs?: number;
};

export type SendOtpStatus = "otp_sent" | "pending_contact" | "delivery_failed";

export type SendOtpResponse = {
	status: SendOtpStatus;
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

export async function finishRegistration(data: FinishRegistrationDto): Promise<OkWithTtls> {
	const res = await apiClient.post<OkWithTtls>(`${USERS}/signup/finish`, data, {
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

export async function publicSignup(data: PublicSignupDto): Promise<UserResponse> {
	const res = await apiClient.post<UserResponse>(`${USERS}/signup`, data, {
		withCredentials: true,
	});
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

export async function getUserById(id: string): Promise<UserResponse> {
	const res = await apiClient.get<UserResponse>(`${USERS}/${id}`, {
		withCredentials: true,
	});
	return res.data;
}

export async function sendOtp(email: string): Promise<SendOtpResponse> {
	const res = await apiClient.post<SendOtpResponse>(
		`${USERS}/send-otp`,
		{ email },
		{
			withCredentials: true,
		},
	);
	return res.data;
}

export const AuthApi = {
	askLogin,
	finishLogin,
	finishRegistration,
	refresh,
	logout,
	publicSignup,
	signup,
	getCurrentUser,
	getUsers,
	getUserById,
	sendOtp,
};
