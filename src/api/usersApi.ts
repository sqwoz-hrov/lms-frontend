// src/api/usersApi.ts
// Работа с пользователями по спецификации /users/* (login, signup)

import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type AskLoginDto = {
	email: string;
};

export type FinishLoginDto = {
	email: string;
	otpCode: number;
};

export type FinishLoginResponse = {
	token: string; // JWT access token
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

// ===== API =====
const USERS = "/users";

/**
 * Начинает процедуру логина: отправляет OTP на email
 * POST /users/login
 */
export async function askLogin(data: AskLoginDto): Promise<void> {
	await apiClient.post(`${USERS}/login`, data);
}

/**
 * Завершает логин по OTP и возвращает JWT токен
 * POST /users/login/finish
 */
export async function finishLogin(data: FinishLoginDto): Promise<FinishLoginResponse> {
	const res = await apiClient.post<FinishLoginResponse>(`${USERS}/login/finish`, data);
	return res.data;
}

/**
 * Регистрирует нового пользователя
 * POST /users/signup
 */
export async function signup(data: SignupDto): Promise<UserResponse> {
	const res = await apiClient.post<UserResponse>(`${USERS}/signup`, data);
	return res.data;
}

/**
 * Получает текущего пользователя
 * GET /users/get-me
 */
export async function getCurrentUser(): Promise<UserResponse> {
	const res = await apiClient.get<UserResponse>(`${USERS}/get-me`);
	return res.data;
}

/**
 * Получает список пользователей
 * GET /users
 * (без параметров)
 */
export async function getUsers(): Promise<UserResponse[]> {
	const res = await apiClient.get<UserResponse[]>(`${USERS}`);
	return res.data;
}

// Агрегатор
export const AuthApi = {
	askLogin,
	finishLogin,
	signup,
	getCurrentUser,
	getUsers,
};
