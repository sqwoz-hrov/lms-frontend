// src/hooks/useAuth.ts
import { askLogin, finishLogin } from "@/api/usersApi";

export function useAuth() {
	async function askOtp(email: string) {
		await askLogin({ email }); // твой эндпоинт askLogin (отправляет OTP на почту)
	}

	async function finishOtp(email: string, otpCode: number) {
		const { token } = await finishLogin({ email, otpCode });
		localStorage.setItem("token", token);
	}

	function logout() {
		localStorage.removeItem("token");
	}

	return { askOtp, finishOtp, logout };
}
