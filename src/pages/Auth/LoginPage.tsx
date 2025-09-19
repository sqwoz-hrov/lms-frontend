// src/pages/Auth/LoginPage.tsx
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EmailStep } from "@/components/auth/EmailStep";
import { OtpStep } from "@/components/auth/OtpStep";

export function LoginPage() {
	const { askOtp, finishOtp } = useAuth();
	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");

	async function handleEmailSubmit(email: string) {
		await askOtp(email);
		setEmail(email);
		setStep("otp");
	}

	async function handleOtpSubmit(otp: string) {
		await finishOtp(email, Number(otp));
		// после успешного логина можно редиректнуть на главную
		window.location.href = "/materials";
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
			<h1 className="text-2xl font-bold mb-6">Вход</h1>
			{step === "email" ? (
				<EmailStep onSuccess={handleEmailSubmit} />
			) : (
				<OtpStep email={email} onSubmitOtp={handleOtpSubmit} />
			)}
		</div>
	);
}
