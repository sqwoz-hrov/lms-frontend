import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Moon, SunMedium, CheckCircle2, Loader2 } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserSettingsApi, type ThemePreference } from "@/api/userSettingsApi";

const THEME_OPTIONS: Array<{
	value: ThemePreference;
	title: string;
	description: string;
	icon: typeof SunMedium;
}> = [
	{
		value: "light",
		title: "Светлая тема",
		description: "Классические светлые фоны и высокая контрастность. Подходит для хорошо освещённых помещений.",
		icon: SunMedium,
	},
	{
		value: "dark",
		title: "Тёмная тема",
		description: "Темная палитра, менее напрягающая глаза вечером или при работе в условиях слабого освещения.",
		icon: Moon,
	},
];

export function SettingsPage() {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const updateThemeMutation = useMutation({
		mutationFn: UserSettingsApi.update,
		onSuccess: (_data, variables) => {
			const title = variables.theme === "dark" ? "Тёмная тема включена" : "Светлая тема включена";
			toast.success(title);
		},
	});

	const currentTheme = useMemo<ThemePreference>(() => {
		if (theme === "dark" || resolvedTheme === "dark") {
			return "dark";
		}
		return "light";
	}, [theme, resolvedTheme]);

	const handleThemeChange = (targetTheme: ThemePreference) => {
		if (targetTheme === currentTheme || updateThemeMutation.isPending) {
			return;
		}

		const previousTheme = currentTheme;
		setTheme(targetTheme);

		updateThemeMutation.mutate(
			{ theme: targetTheme },
			{
				onError: error => {
					const description = error instanceof Error ? error.message : "Попробуйте ещё раз позже.";
					toast.error("Не удалось сохранить тему", { description });
					setTheme(previousTheme);
				},
			},
		);
	};

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
			<div className="space-y-1.5">
				<h1 className="text-2xl font-semibold">Настройки</h1>
				<p className="text-muted-foreground text-sm">Настройте интерфейс под себя.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Тема интерфейса</CardTitle>
					<CardDescription>Выберите, в какой палитре вам удобнее работать.</CardDescription>
					<CardAction>
						{updateThemeMutation.isPending ? (
							<span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Сохраняем
							</span>
						) : (
							<span className="text-xs text-muted-foreground">Настройка сохраняется автоматически</span>
						)}
					</CardAction>
				</CardHeader>

				<CardContent>
					{mounted ? (
						<div className="grid gap-4 md:grid-cols-2">
							{THEME_OPTIONS.map(option => {
								const Icon = option.icon;
								const isActive = currentTheme === option.value;
								return (
									<button
										key={option.value}
										type="button"
										onClick={() => handleThemeChange(option.value)}
										disabled={updateThemeMutation.isPending}
										aria-pressed={isActive}
										className={cn(
											"flex h-full flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
											isActive
												? "border-primary bg-primary/5 ring-1 ring-primary"
												: "border-border hover:border-primary/70",
											updateThemeMutation.isPending && "cursor-wait opacity-80",
										)}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Icon className="h-5 w-5" />
												<span className="font-medium">{option.title}</span>
											</div>
											{isActive ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
										</div>
										<p className="text-sm text-muted-foreground">{option.description}</p>
									</button>
								);
							})}
						</div>
					) : (
						<div className="grid gap-4 md:grid-cols-2">
							<Skeleton className="h-28 w-full rounded-xl" />
							<Skeleton className="h-28 w-full rounded-xl" />
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
