import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type HomeAudience = "mentor" | "self";

const HOME_AUDIENCE_KEY = "home-audience-choice.v1";

function readHomeAudience(): HomeAudience | null {
	if (typeof window === "undefined") return null;

	try {
		const savedChoice = window.localStorage.getItem(HOME_AUDIENCE_KEY);
		if (savedChoice === "mentor" || savedChoice === "self") {
			return savedChoice;
		}
		return null;
	} catch {
		return null;
	}
}

function writeHomeAudience(value: HomeAudience) {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.setItem(HOME_AUDIENCE_KEY, value);
	} catch {
		// Ignore storage issues to avoid breaking the Home page UI.
	}
}

function ChoiceButton({
	title,
	isActive,
	onClick,
}: {
	title: string;
	isActive: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={isActive}
			className={cn(
				"w-full rounded-xl border px-4 py-4 text-left text-base font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isActive
					? "border-primary bg-primary/5 ring-1 ring-primary"
					: "border-border hover:border-primary/70 hover:bg-muted/30",
			)}
		>
			{title}
		</button>
	);
}

function MentorContent() {
	return (
		<div className="space-y-4 text-base leading-7">
			<p>Сейчас публично для менторов доступны такие инструменты:</p>
			<ul className="list-disc space-y-2 pl-6">
				<li>
					<a className="text-primary underline underline-offset-4" href="/interviews/upload">
						Анализ собеседований
					</a>
				</li>
				<li>
					<a className="text-primary underline underline-offset-4" href="#">
						МенторGPT
					</a>
				</li>
			</ul>

			<p>
				Если нужно больше – напишите в саппорт и мы что-то придумаем. У нас довольно много фичей, которые пока не
				работают публично. <a className="text-primary underline underline-offset-4" href="/faq">Вот тут полный список</a>
			</p>

			<p>
				И да, это всё бесплатно, хотя анализ собеседований ограничен 3 разборами в день. Если нужно больше – платите
				подписку)
			</p>
		</div>
	);
}

function SelfTopicCollapse({ title, children }: { title: string; children: ReactNode }) {
	return (
		<details className="group py-2 transition">
			<summary className="flex cursor-pointer list-none items-start gap-2 text-lg font-semibold leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				<ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
				<span>{title}</span>
			</summary>
			<div className="pl-6 pt-2">{children}</div>
		</details>
	);
}

function SelfContent() {
	return (
		<div className="space-y-6 text-base leading-7">
			<p>
				<a className="text-primary underline underline-offset-4" href="#">
					Мы
				</a>{" "}
				собрали в одном месте все инструменты, советы и гайды для победы на грустном трудовом рынке 2026 года
				<br/>
				<br/>
				Сделайте свой первый шаг к новой работе уже сейчас
			</p>

			<section className="space-y-4">
				<h2 className="text-2xl font-semibold tracking-tight">С чем вам помочь?</h2>

				<SelfTopicCollapse title="Не знаю кем работать">
					<ul className="list-disc space-y-1 pl-6">
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								статья/видос
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								ссылки для дальнейшего чтения
							</a>
						</li>
					</ul>
				</SelfTopicCollapse>

				<SelfTopicCollapse title="У меня нет резюме">
					<ul className="list-disc space-y-1 pl-6">
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								статья/видос
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								тул (менторЖПТ)
							</a>
						</li>
					</ul>
				</SelfTopicCollapse>

				<SelfTopicCollapse title="Откликаюсь на вакансии, но мне не отвечают / эйчары не пишут">
					<ul className="list-disc space-y-1 pl-6">
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								статья
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								тул (фаззи-обогатитель)
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								тул 2 (база ключевиков)
							</a>
						</li>
					</ul>
				</SelfTopicCollapse>

				<SelfTopicCollapse title="Не пишут после разговора с эйчарами">
					<ul className="list-disc space-y-1 pl-6">
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								статья
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								тул
							</a>
						</li>
					</ul>
				</SelfTopicCollapse>

				<SelfTopicCollapse title="Не могу пройти техническое собеседование">
					<ul className="list-disc space-y-1 pl-6">
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								статья
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								тул
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								тул
							</a>
						</li>
					</ul>
				</SelfTopicCollapse>

				<SelfTopicCollapse title="Не могу пройти финалку / собеседование с руководителем / cultural fit">
					<ul className="list-disc space-y-1 pl-6">
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								статья
							</a>
						</li>
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								тул
							</a>
						</li>
					</ul>
				</SelfTopicCollapse>

				<SelfTopicCollapse title="Сливают после оффера">
					<ul className="list-disc space-y-1 pl-6">
						<li>
							<a className="text-primary underline underline-offset-4" href="#">
								статья
							</a>
						</li>
					</ul>
				</SelfTopicCollapse>
			</section>

			<section className="space-y-3">
				<h2 className="text-2xl font-semibold tracking-tight">Это платно?</h2>
				<p>
					Часть инструментов имеют лимиты или более простые версии на бесплатном уровне подписки. Если вы хотите
					максимум скорости и удобства – берите платную подписку
				</p>
				<p>А весь контент полностью бесплатен)</p>
			</section>
		</div>
	);
}

export function HomePage() {
	const { user } = useAuth();
	const [audience, setAudience] = useState<HomeAudience | null>(null);

	useEffect(() => {
		setAudience(readHomeAudience());
	}, []);

	const selectAudience = (nextAudience: HomeAudience) => {
		setAudience(nextAudience);
		writeHomeAudience(nextAudience);
	};

	const switchModeLabel = useMemo(() => {
		if (audience === "mentor") return "Ищете работу сами?";
		if (audience === "self") return "Менторите?";
		return "";
	}, [audience]);

	const switchAudience = () => {
		if (!audience) return;
		selectAudience(audience === "mentor" ? "self" : "mentor");
	};

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6 md:py-8">
			<div className={cn("space-y-2", audience !== null && "border-b pb-4")}>
				<h1 className="text-2xl font-semibold tracking-tight">Добро пожаловать на Сквозь Эйчаров-платформу{user?.name ? `, ${user.name}` : ""}</h1>
			</div>

			{audience === null ? (
				<section className="mt-6 space-y-4">
					<div className="space-y-1.5">
						<h2 className="text-xl font-semibold tracking-tight">Планируете пользоваться платформой сами или для учеников?</h2>
						<p className="text-sm text-muted-foreground">Выберите путь, и мы поможем вам найти материалы и инструменты для ваших нужд</p>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<ChoiceButton title="Я ментор, для учеников" isActive={false} onClick={() => selectAudience("mentor")} />
						<ChoiceButton title="Самостоятельно" isActive={false} onClick={() => selectAudience("self")} />
					</div>
				</section>
			) : (
				<div className="mt-6 space-y-6">
					{audience === "mentor" ? <MentorContent /> : <SelfContent />}
					<div>
						<button
							type="button"
							onClick={switchAudience}
							aria-pressed={false}
							className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:border-primary/70 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{switchModeLabel}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
