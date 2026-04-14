import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function NotLoggedInHomePage() {
	return (
		<main className="h-[100dvh] snap-y snap-mandatory overflow-y-auto bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_45%),radial-gradient(circle_at_80%_0%,hsl(var(--accent)/0.15),transparent_35%),hsl(var(--background))] text-foreground">
			<section className="relative flex min-h-[100dvh] snap-start flex-col px-6 pb-10">
				<header className="-mx-6 flex min-h-20 w-[calc(100%+3rem)] items-center justify-between gap-3 border-b border-white/70 bg-black px-6 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
					<Link to="/" aria-label="SQWOZ home" className="inline-flex items-center">
						<img
							src="/sqwoz_platform_logo.png"
							alt="Сквозь platform logo"
							className="h-14 w-35 brightness-0 invert"
						/>
					</Link>
				</header>

				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-sm rounded-2xl border border-foreground/35 bg-background/50 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.22)] backdrop-blur">
						<div className="flex w-full flex-col gap-3">
                            <h1 className="text-center text-xl font-bold tracking-tight mb-5">Платформа "Сквозь Эйчаров"</h1>
							<Button
								asChild
								variant="outline"
								size="lg"
								className="w-full min-h-12 font-semibold border-foreground/60 bg-transparent hover:bg-foreground/10"
							>
							<Link to="/login">Войти</Link>
							</Button>
							<Button asChild variant="default" size="lg" className="w-full min-h-12 font-semibold bg-black text-white hover:bg-black/60">
							<Link to="/signup">Регистрация</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
