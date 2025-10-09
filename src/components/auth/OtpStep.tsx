// src/components/auth/OtpStep.tsx
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function OtpStep({ onSubmitOtp }: { email: string; onSubmitOtp: (otp: string) => void }) {
	const { register, handleSubmit, formState } = useForm<{ otp: string }>();

	return (
		<form onSubmit={handleSubmit(d => onSubmitOtp(d.otp))} className="space-y-4 max-w-sm mx-auto">
			<p className="text-sm text-gray-600">
				На <span className="font-medium">ваш телеграм</span> был отправлен код
			</p>
			<Input type="text" placeholder="Введите код" {...register("otp", { required: "Введите код из письма" })} />
			<Button type="submit" disabled={formState.isSubmitting} className="w-full">
				{formState.isSubmitting ? "Проверка..." : "Войти"}
			</Button>
		</form>
	);
}
