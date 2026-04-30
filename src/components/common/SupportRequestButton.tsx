import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";

function normalizeTelegramUsername(raw: string | undefined): string {
	return (raw ?? "").trim().replace(/^@/, "");
}

export function SupportRequestButton() {
	const { user } = useAuth();
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [hasBottomRightControl, setHasBottomRightControl] = useState(false);
	const supportButtonRef = useRef<HTMLButtonElement | null>(null);

	const telegramUsername = useMemo(() => {
		const supportUsername = normalizeTelegramUsername(import.meta.env.VITE_TELEGRAM_SUPPORT_USERNAME as string | undefined);
		if (supportUsername) {
			return supportUsername;
		}
		return normalizeTelegramUsername(import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined);
	}, []);

	const isSubmitDisabled = !message.trim() || !telegramUsername;
	const supportButtonOffsetClass = hasBottomRightControl ? "bottom-24" : "bottom-4";

	useEffect(() => {
		function scanBottomRightControls() {
			const supportButton = supportButtonRef.current;
			if (!supportButton) {
				setHasBottomRightControl(false);
				return;
			}

			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;
			const rightBoundary = viewportWidth - 220;
			const bottomBoundary = viewportHeight - 220;

			const interactiveElements = document.querySelectorAll<HTMLElement>("button, a, [role='button']");
			let foundOtherBottomRightControl = false;

			for (const element of interactiveElements) {
				if (element === supportButton || supportButton.contains(element) || element.contains(supportButton)) {
					continue;
				}

				const styles = window.getComputedStyle(element);
				if (styles.display === "none" || styles.visibility === "hidden" || styles.pointerEvents === "none") {
					continue;
				}

				const rect = element.getBoundingClientRect();
				const isOffscreen = rect.bottom <= 0 || rect.right <= 0 || rect.top >= viewportHeight || rect.left >= viewportWidth;
				if (isOffscreen || rect.width === 0 || rect.height === 0) {
					continue;
				}

				const isBottomRight = rect.right >= rightBoundary && rect.bottom >= bottomBoundary;
				if (isBottomRight) {
					foundOtherBottomRightControl = true;
					break;
				}
			}

			setHasBottomRightControl(foundOtherBottomRightControl);
		}

		function scheduleScan() {
			window.requestAnimationFrame(scanBottomRightControls);
		}

		scheduleScan();

		const observer = new MutationObserver(scheduleScan);
		observer.observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["class", "style", "hidden", "aria-hidden", "data-state"],
		});

		window.addEventListener("resize", scheduleScan);
		window.addEventListener("scroll", scheduleScan, true);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", scheduleScan);
			window.removeEventListener("scroll", scheduleScan, true);
		};
	}, []);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isSubmitDisabled) {
			return;
		}

		const route = `${location.pathname}${location.search}${location.hash}`;
		const emailPart = user?.email?.trim() ? ` (${user.email.trim()})` : "";
		const userTelegram = user?.telegram_username?.trim();
		const telegramPart = userTelegram ? ` (@${userTelegram.replace(/^@/, "")})` : "";
		const routePart = ` (${route || "/"})`;
		const supportMessage = `#support${emailPart}${telegramPart}${routePart} ${message.trim()}`;

		const encodedMessage = encodeURIComponent(supportMessage);
		const supportUrl = `https://t.me/${telegramUsername}?text=${encodedMessage}`;
		window.open(supportUrl, "_blank", "noopener,noreferrer");
		setOpen(false);
		setMessage("");
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						ref={supportButtonRef}
						type="button"
						size="icon"
						onClick={() => setOpen(true)}
						className={`fixed right-4 ${supportButtonOffsetClass} z-40 size-11 rounded-full shadow-lg`}
						aria-label="Написать в поддержку"
					>
						<Headset className="size-5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="left" sideOffset={8}>
					Написать в поддержку
				</TooltipContent>
			</Tooltip>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Написать в поддержку</DialogTitle>
						<DialogDescription>
							Опишите вопрос, и мы откроем Telegram с готовым текстом сообщения.
						</DialogDescription>
					</DialogHeader>

					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<Label htmlFor="support-message" required>
								Сообщение
							</Label>
							<Textarea
								id="support-message"
								placeholder="Опишите ваш вопрос"
								value={message}
								onChange={event => setMessage(event.target.value)}
								rows={5}
								required
							/>
							{!telegramUsername && (
								<p className="text-sm text-destructive">Не задан Telegram username поддержки в переменных окружения.</p>
							)}
						</div>

						<DialogFooter>
							<Button type="submit" disabled={isSubmitDisabled}>
								Отправить
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
