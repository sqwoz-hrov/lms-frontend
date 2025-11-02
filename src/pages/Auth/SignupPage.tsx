// src/pages/Auth/SignupPage.tsx
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { publicSignup, sendOtp as sendSignupOtp, type PublicSignupDto, type SendOtpResponse } from "@/api/usersApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpForm } from "@/components/auth/OtpForm";
import { useAuth } from "@/hooks/useAuth";

type FormData = {
	name: string;
	email: string;
	telegram_username: string;
};

type SignupStep = "form" | "bot" | "otp";

type SignupProgress = {
	step: Exclude<SignupStep, "form">;
	email: string;
	updatedAt: number;
};

const SIGNUP_PROGRESS_KEY = "public-signup-progress";

export function SignupPage() {
	const navigate = useNavigate();
	const { finishOtp, loading: authLoading, error: authError } = useAuth();
	const [step, setStep] = useState<SignupStep>("form");
	const [serverError, setServerError] = useState<string | null>(null);
	const [highlightEmail, setHighlightEmail] = useState(false);
	const [emailForOtp, setEmailForOtp] = useState("");
	const [otpError, setOtpError] = useState<string | null>(null);
	const lastOtpRequestEmailRef = useRef<string | null>(null);

	const rawBotName = (import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined) ?? "";
	const normalizedBotName = rawBotName.trim().replace(/^@/, "");
	const displayBotName = normalizedBotName ? `@${normalizedBotName}` : "нашему Telegram-боту";
	const botLink = normalizedBotName ? `https://t.me/${normalizedBotName}` : undefined;

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isSubmitting },
	} = useForm<FormData>({
		mode: "onChange",
		defaultValues: {
			name: "",
			email: "",
			telegram_username: "",
		},
	});

	const signupMutation = useMutation({
		mutationFn: publicSignup,
		onSuccess: (_, variables) => {
			setServerError(null);
			setOtpError(null);
			setStep("bot");
			const email = variables.email.trim();
			setEmailForOtp(email);
			saveSignupProgress({ step: "bot", email });
		},
		onError: (err: any) => {
			setHighlightEmail(err?.response?.status === 400);
			setServerError(err?.response?.data?.message || "Не удалось зарегистрироваться");
		},
	});

	const otpRequestMutation = useMutation<SendOtpResponse, unknown, string>({
		mutationFn: async (email: string) => {
			const normalizedEmail = email.trim();
			if (!normalizedEmail) {
				throw new Error("Не найден email для подтверждения");
			}
			return await sendSignupOtp(normalizedEmail);
		},
		onMutate: () => {
			setOtpError(null);
		},
		onError: error => {
			const axiosMessage = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
			const message = axiosMessage ?? (error instanceof Error ? error.message : "Не удалось отправить код");
			setOtpError(message);
		},
		onSuccess: data => {
			if (data.status === "pending_contact") {
				const botMention = normalizedBotName ? `@${normalizedBotName}` : displayBotName;
				setOtpError(`Вы не написали боту. Напишите боту ${botMention} и нажмите кнопку "Отправить код еще раз"`);
				return;
			}
			setOtpError(null);
		},
	});

	const {
		mutate: triggerOtpRequest,
		mutateAsync: triggerOtpRequestAsync,
		isPending: isOtpSending,
	} = otpRequestMutation;

	async function onSubmit(values: FormData) {
		setServerError(null);

		const payload: PublicSignupDto = {
			name: values.name.trim(),
			email: values.email.trim(),
			telegram_username: normalizeTelegram(values.telegram_username),
		};

		try {
			setHighlightEmail(false);
			await signupMutation.mutateAsync(payload);
		} catch {
			// onError хендлер покажет сообщение
		}
	}

	async function handleOtpSubmit(otp: string) {
		if (!emailForOtp) {
			throw new Error("Не найден email для подтверждения");
		}
		const normalizedOtp = otp.trim();
		if (!normalizedOtp) {
			throw new Error("Введите код из Telegram");
		}
		const numericOtp = Number(normalizedOtp);
		if (!Number.isInteger(numericOtp)) {
			throw new Error("Код должен содержать только цифры");
		}
		await finishOtp(emailForOtp, numericOtp, { flow: "signup" });
		clearSignupProgress();
		navigate("/materials");
	}

	function handleBotConfirmed() {
		setOtpError(null);
		setStep("otp");
		saveSignupProgress({ step: "otp", email: emailForOtp });
	}

	useEffect(() => {
		const saved = loadSignupProgress();
		if (!saved) {
			return;
		}
		setEmailForOtp(saved.email);
		setStep(saved.step);
	}, []);

	useEffect(() => {
		if (step === "otp" && emailForOtp) {
			const normalizedEmail = emailForOtp.trim();
			if (!normalizedEmail) {
				return;
			}
			if (lastOtpRequestEmailRef.current !== normalizedEmail) {
				lastOtpRequestEmailRef.current = normalizedEmail;
				triggerOtpRequest(normalizedEmail);
			}
		} else {
			lastOtpRequestEmailRef.current = null;
		}
	}, [step, emailForOtp, triggerOtpRequest]);

	async function handleResendOtpRequest() {
		const normalizedEmail = emailForOtp.trim();
		if (!normalizedEmail) {
			throw new Error("Не найден email для подтверждения");
		}
		lastOtpRequestEmailRef.current = normalizedEmail;
		await triggerOtpRequestAsync(normalizedEmail);
	}

	const titles: Record<SignupStep, string> = {
		form: "Регистрация",
		bot: "Подтвердите Telegram",
		otp: "Введите код из Telegram",
	};

	const isSignupSubmitting = isSubmitting || signupMutation.isPending;

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-xl font-semibold text-center">{titles[step]}</CardTitle>
				</CardHeader>
				<CardContent>
					{step === "form" && (
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="name">Имя</Label>
								<Input
									id="name"
									placeholder="Например: Иван Иванов"
									autoFocus
									{...register("name", {
										required: "Укажите имя",
										minLength: { value: 2, message: "Минимум 2 символа" },
									})}
								/>
								{errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="name@example.com"
									aria-invalid={highlightEmail}
									{...register("email", {
										required: "Укажите email",
										pattern: {
											value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
											message: "Некорректный email",
										},
										onChange: () => setHighlightEmail(false),
									})}
								/>
								{errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
							</div>

							<div className="space-y-2">
								<Label htmlFor="telegram_username">Telegram</Label>
								<Input
									id="telegram_username"
									placeholder="@username"
									{...register("telegram_username", {
										required: "Укажите Telegram username",
										validate: validateTelegram,
									})}
								/>
								<p className="text-xs text-muted-foreground">Можно указывать с @ или без — мы нормализуем.</p>
								{errors.telegram_username && (
									<p className="text-xs text-red-600">{String(errors.telegram_username.message)}</p>
								)}
							</div>

							{serverError && <p className="text-sm text-red-600">{serverError}</p>}

							<div className="flex flex-col gap-3">
								<Button type="submit" disabled={!isValid || isSignupSubmitting}>
									{signupMutation.isPending ? "Регистрация..." : "Зарегистрироваться"}
								</Button>
								<Button type="button" variant="ghost" onClick={() => navigate("/login")} disabled={isSignupSubmitting}>
									У меня уже есть аккаунт
								</Button>
							</div>
						</form>
					)}

					{step === "bot" && (
						<div className="space-y-6">
							<div className="space-y-2 text-center text-sm text-muted-foreground">
								<p>Заявка отправлена — осталось подтвердить аккаунт.</p>
								<p>
									Напишите боту <span className="font-medium">{displayBotName}</span> в Telegram и следуйте его
									инструкциям, чтобы получить одноразовый код.
								</p>
							</div>
							{botLink && (
								<Button asChild variant="outline" className="w-full">
									<a href={botLink} target="_blank" rel="noopener noreferrer">
										Открыть {displayBotName} в Telegram
									</a>
								</Button>
							)}
							<Button type="button" className="w-full" onClick={handleBotConfirmed} disabled={!emailForOtp}>
								Я написал боту
							</Button>
							<Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>
								У меня уже есть аккаунт
							</Button>
						</div>
					)}

					{step === "otp" && (
						<div className="space-y-6">
							<OtpForm
								onSubmitOtp={handleOtpSubmit}
								submitLabel="Завершить регистрацию"
								submittingLabel="Подтверждение..."
								description={`Введите код, который отправил ${displayBotName} в Telegram`}
								errorMessage={otpError ?? authError}
								disabled={authLoading}
								onResendOtp={handleResendOtpRequest}
								resendLabel="Отправить код еще раз"
								resendPendingLabel="Отправляем код..."
								isResending={isOtpSending}
							/>
							<Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>
								У меня уже есть аккаунт
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function normalizeTelegram(value: string) {
	const trimmed = value.trim();
	return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function validateTelegram(value: string) {
	if (/^@?[A-Za-z0-9_]{5,32}$/.test(value)) {
		return true;
	}
	return "Формат: @username (5–32 символов, латиница/цифры/_)";
}

function loadSignupProgress(): SignupProgress | null {
	if (typeof window === "undefined") {
		return null;
	}
	const raw = window.localStorage.getItem(SIGNUP_PROGRESS_KEY);
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw) as Partial<SignupProgress> | null;
		if (
			!parsed ||
			(parsed.step !== "bot" && parsed.step !== "otp") ||
			typeof parsed.email !== "string" ||
			parsed.email.trim() === ""
		) {
			return null;
		}
		return {
			step: parsed.step,
			email: parsed.email.trim(),
			updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
		};
	} catch {
		return null;
	}
}

function saveSignupProgress(progress: { step: SignupProgress["step"]; email: string }) {
	if (typeof window === "undefined") {
		return;
	}
	const payload: SignupProgress = {
		step: progress.step,
		email: progress.email.trim(),
		updatedAt: Date.now(),
	};
	window.localStorage.setItem(SIGNUP_PROGRESS_KEY, JSON.stringify(payload));
}

function clearSignupProgress() {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.removeItem(SIGNUP_PROGRESS_KEY);
}
