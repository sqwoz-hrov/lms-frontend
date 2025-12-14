import { INTERVIEW_TRANSCRIPTION_EVENT } from "@/constants/interviewTranscriptions";
import { apiBaseURL } from "@/api/client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const SSE_ROUTE = "/sse/stream";
const MAX_EVENTS = 200;
const CUSTOM_SSE_EVENTS = [INTERVIEW_TRANSCRIPTION_EVENT] as const;

export type SseEnvelope = {
	id?: string;
	event: string;
	data: unknown;
	raw: string;
	receivedAt: number;
};

type SseContextValue = {
	status: "idle" | "connecting" | "open" | "error";
	events: SseEnvelope[];
	lastError: string | null;
	reconnect: () => void;
};

const SseContext = createContext<SseContextValue | undefined>(undefined);

export function SseProvider({ children }: { children: React.ReactNode }) {
	const [events, setEvents] = useState<SseEnvelope[]>([]);
	const [status, setStatus] = useState<SseContextValue["status"]>("idle");
	const [lastError, setLastError] = useState<string | null>(null);
	const [reconnectFlag, setReconnectFlag] = useState(0);

	useEffect(() => {
		if (typeof window === "undefined" || typeof EventSource === "undefined") {
			setStatus("error");
			setLastError("EventSource is not supported in this environment");
			return;
		}

		let eventSource: EventSource | null = null;
		let removeEventListeners: (() => void) | null = null;
		let disposed = false;
		let retryAttempt = 0;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

		const sseUrl = `${apiBaseURL}${SSE_ROUTE}`;

		const cleanupEventSource = () => {
			removeEventListeners?.();
			removeEventListeners = null;
			eventSource?.close();
			eventSource = null;
		};

		const attachEventListeners = (es: EventSource) => {
			const handleMessage = (event: MessageEvent<string>) => {
				if (disposed) return;

				const parsed = parseMessageEvent(event);

				setEvents(prev => {
					const next = [parsed, ...prev];
					return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
				});
			};

			es.addEventListener("message", handleMessage);

			const customListenerCleanups = CUSTOM_SSE_EVENTS.map(eventName => {
				const listener: EventListener = event => handleMessage(event as MessageEvent<string>);
				es.addEventListener(eventName, listener);
				return () => es.removeEventListener(eventName, listener);
			});

			return () => {
				es.removeEventListener("message", handleMessage);
				customListenerCleanups.forEach(cleanup => cleanup());
			};
		};

		const connect = () => {
			if (disposed) return;
			setStatus("connecting");
			setLastError(null);
			cleanupEventSource();

			const es = new EventSource(sseUrl, { withCredentials: true });
			eventSource = es;
			removeEventListeners = attachEventListeners(es);

			es.onopen = () => {
				if (disposed) return;
				setStatus("open");
				setLastError(null);
				retryAttempt = 0;
			};

			es.onerror = () => {
				if (disposed) return;
				setStatus("error");
				setLastError("Подключение к SSE потеряно. Пытаемся восстановить…");
				cleanupEventSource();

				const delay = Math.min(30_000, 1000 * Math.pow(2, retryAttempt));
				retryAttempt += 1;
				reconnectTimer = setTimeout(connect, delay);
			};
		};

		connect();

		return () => {
			disposed = true;
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
			}
			cleanupEventSource();
		};
	}, [reconnectFlag]);

	const reconnect = useCallback(() => {
		setReconnectFlag(flag => flag + 1);
	}, []);

	const value = useMemo<SseContextValue>(
		() => ({
			status,
			events,
			lastError,
			reconnect,
		}),
		[status, events, lastError, reconnect],
	);

	return <SseContext.Provider value={value}>{children}</SseContext.Provider>;
}

function parseMessageEvent(event: MessageEvent<string>): SseEnvelope {
	const raw = event.data;
	let parsedData: unknown = raw;
	let inferredEvent = event.type || "message";
	let id = event.lastEventId || undefined;

	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (trimmed.length > 0) {
			try {
				const parsed: unknown = JSON.parse(trimmed);
				parsedData = parsed;

				if (isRecord(parsed)) {
					const parsedId = parsed["id"];
					if (!id && typeof parsedId === "string") {
						id = parsedId;
					}
					const nestedType =
						(typeof parsed["type"] === "string" && parsed["type"]) ||
						(typeof parsed["event_type"] === "string" && parsed["event_type"]) ||
						(typeof parsed["event"] === "string" && parsed["event"]) ||
						null;
					if (nestedType) {
						inferredEvent = nestedType;
					}
				}
			} catch {
				// оставляем raw строкой
			}
		}
	}

	return {
		id,
		event: inferredEvent || "message",
		data: parsedData,
		raw,
		receivedAt: Date.now(),
	};
}

export function useSse() {
	const ctx = useContext(SseContext);
	if (!ctx) {
		throw new Error("useSse must be used within SseProvider");
	}
	return ctx;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
