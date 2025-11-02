// src/pages/Auth/LoginPage.tsx
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EmailStep } from "@/components/auth/EmailStep";
import { OtpForm } from "@/components/auth/OtpForm";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function LoginPage() {
	const { askOtp, finishOtp, loading, error } = useAuth();
	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");
	const navigate = useNavigate();

	async function handleEmailSubmit(email: string) {
		await askOtp(email);
		setEmail(email);
		setStep("otp");
	}

	async function handleOtpSubmit(otp: string) {
		await finishOtp(email, Number(otp));
		// после успешного логина можно редиректнуть на главную
		navigate("/materials");
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
			<h1 className="text-2xl font-bold mb-6">Вход</h1>
			{step === "email" ? (
				<EmailStep onSuccess={handleEmailSubmit} />
			) : (
				<OtpForm onSubmitOtp={handleOtpSubmit} errorMessage={error} disabled={loading} />
			)}
			<div className="mt-6 text-center space-y-2">
				<p className="text-sm text-muted-foreground">Нет аккаунта?</p>
				<Button type="button" variant="link" onClick={() => navigate("/signup")}>
					Зарегистрироваться
				</Button>
			</div>
		</div>
	);
}
