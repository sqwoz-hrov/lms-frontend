// src/components/auth/EmailStep.tsx
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EmailStep({ onSuccess }: { onSuccess: (email: string) => Promise<void> }) {
	const { register, handleSubmit, formState } = useForm<{ email: string }>();

	return (
		<form
			onSubmit={handleSubmit(async d => {
				await onSuccess(d.email); // дождёмся успешной отправки OTP
			})}
			className="space-y-4 max-w-sm mx-auto"
		>
			<Input type="email" placeholder="Введите email" {...register("email", { required: "Email обязателен" })} />
			<Button type="submit" disabled={formState.isSubmitting} className="w-full">
				{formState.isSubmitting ? "Отправка..." : "Отправить код"}
			</Button>
		</form>
	);
}
