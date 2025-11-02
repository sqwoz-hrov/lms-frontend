// src/components/auth/OtpForm.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type OtpFormProps = {
	onSubmitOtp: (otp: string) => Promise<void> | void;
	submitLabel?: string;
	submittingLabel?: string;
	description?: string;
	errorMessage?: string | null;
	disabled?: boolean;
	onResendOtp?: () => Promise<void> | void;
	resendLabel?: string;
	resendPendingLabel?: string;
	isResending?: boolean;
};

export function OtpForm({
	onSubmitOtp,
	submitLabel = "Войти",
	submittingLabel = "Проверка...",
	description = "На ваш телеграм был отправлен код",
	errorMessage,
	disabled = false,
	onResendOtp,
	resendLabel = "Отправить код повторно",
	resendPendingLabel = "Отправляем код...",
	isResending = false,
}: OtpFormProps) {
	const {
		register,
		handleSubmit,
		formState: { isSubmitting, errors },
		setError,
		clearErrors,
	} = useForm<{ otp: string }>();
	const [resendSubmitting, setResendSubmitting] = useState(false);

	async function handleSubmitOtp(otp: string) {
		try {
			clearErrors("otp");
			await onSubmitOtp(otp);
		} catch (e) {
			// Показываем ошибку в форме, а не только в родителе
			const message = e instanceof Error ? e.message : "Не удалось подтвердить код";
			setError("otp", { type: "manual", message });
		}
	}

	async function handleResend() {
		if (!onResendOtp) {
			return;
		}
		try {
			setResendSubmitting(true);
			clearErrors("otp");
			await onResendOtp();
		} catch (e) {
			const message = e instanceof Error ? e.message : "Не удалось отправить код";
			setError("otp", { type: "manual", message });
		} finally {
			setResendSubmitting(false);
		}
	}

	const fieldError = errors.otp?.message;
	const messageToShow = fieldError ?? errorMessage ?? null;
	const resendInProgress = resendSubmitting || isResending;

	return (
		<form onSubmit={handleSubmit(async d => handleSubmitOtp(d.otp))} className="space-y-4 max-w-sm mx-auto text-center">
			<p className="text-sm text-muted-foreground">{description}</p>
			<div className="space-y-2 text-left">
				<Input
					type="text"
					autoFocus
					inputMode="numeric"
					placeholder="Введите код"
					{...register("otp", { required: "Введите код из Telegram" })}
					aria-describedby={messageToShow ? "otp-error" : undefined}
				/>
				{messageToShow && (
					<p id="otp-error" className="text-xs text-red-600">
						{messageToShow}
					</p>
				)}
			</div>
			<Button type="submit" disabled={isSubmitting || disabled} className="w-full">
				{isSubmitting || disabled ? submittingLabel : submitLabel}
			</Button>
			{onResendOtp && (
				<Button
					type="button"
					variant="outline"
					disabled={disabled || resendInProgress}
					onClick={handleResend}
					className="w-full"
				>
					{resendInProgress ? resendPendingLabel : resendLabel}
				</Button>
			)}
		</form>
	);
}
