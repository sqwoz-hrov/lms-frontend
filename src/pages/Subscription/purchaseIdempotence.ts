const PURCHASE_INTENT_STORAGE_PREFIX = "lms:subscription-purchase";
const PURCHASE_INTENT_TTL_MS = 24 * 60 * 60 * 1_000;
const LOCAL_STORAGE_PROBE_KEY = `${PURCHASE_INTENT_STORAGE_PREFIX}:probe`;

const tabScopedPurchaseStorage = new Map<string, string>();
let canUseLocalStorage: boolean | undefined;

type StoredPurchaseIntent = {
	idempotenceKey: string;
	createdAt: number;
	clearWhenIdle?: boolean;
};

type StoredPurchaseRequest = {
	idempotenceKey: string;
	startedAt: number;
};

export type PurchaseRequestLease = {
	userId: string;
	tierId: string;
	idempotenceKey: string;
	requestId: string;
};

function isLocalStorageAvailable() {
	if (canUseLocalStorage !== undefined) return canUseLocalStorage;

	try {
		localStorage.setItem(LOCAL_STORAGE_PROBE_KEY, LOCAL_STORAGE_PROBE_KEY);
		localStorage.removeItem(LOCAL_STORAGE_PROBE_KEY);
		canUseLocalStorage = true;
	} catch {
		canUseLocalStorage = false;
	}

	return canUseLocalStorage;
}

function getStoredValue(key: string) {
	if (isLocalStorageAvailable()) {
		try {
			return localStorage.getItem(key);
		} catch {
			canUseLocalStorage = false;
		}
	}

	return tabScopedPurchaseStorage.get(key) ?? null;
}

function setStoredValue(key: string, value: string) {
	if (isLocalStorageAvailable()) {
		try {
			localStorage.setItem(key, value);
			return;
		} catch {
			canUseLocalStorage = false;
		}
	}

	tabScopedPurchaseStorage.set(key, value);
}

function removeStoredValue(key: string) {
	if (isLocalStorageAvailable()) {
		try {
			localStorage.removeItem(key);
			return;
		} catch {
			canUseLocalStorage = false;
		}
	}

	tabScopedPurchaseStorage.delete(key);
}

function getStoredKeys() {
	if (isLocalStorageAvailable()) {
		try {
			const keys: string[] = [];
			for (let index = 0; index < localStorage.length; index += 1) {
				const key = localStorage.key(index);
				if (key) keys.push(key);
			}
			return keys;
		} catch {
			canUseLocalStorage = false;
		}
	}

	return [...tabScopedPurchaseStorage.keys()];
}

function getPurchaseScope(userId: string, tierId: string) {
	return `${userId}:${tierId}`;
}

function getPurchaseIntentStorageKey(userId: string, tierId: string) {
	return `${PURCHASE_INTENT_STORAGE_PREFIX}:${getPurchaseScope(userId, tierId)}`;
}

function getPurchaseRequestStoragePrefix(userId: string, tierId: string) {
	return `${getPurchaseIntentStorageKey(userId, tierId)}:in-flight:`;
}

function parseStoredPurchaseIntent(value: string | null): StoredPurchaseIntent | null {
	if (!value) return null;

	try {
		const parsed = JSON.parse(value) as Partial<StoredPurchaseIntent>;
		if (typeof parsed.idempotenceKey !== "string" || typeof parsed.createdAt !== "number") return null;
		if (Date.now() - parsed.createdAt >= PURCHASE_INTENT_TTL_MS) return null;
		return {
			idempotenceKey: parsed.idempotenceKey,
			createdAt: parsed.createdAt,
			clearWhenIdle: parsed.clearWhenIdle === true,
		};
	} catch {
		return null;
	}
}

function parseStoredPurchaseRequest(value: string | null): StoredPurchaseRequest | null {
	if (!value) return null;

	try {
		const parsed = JSON.parse(value) as Partial<StoredPurchaseRequest>;
		if (typeof parsed.idempotenceKey !== "string" || typeof parsed.startedAt !== "number") return null;
		if (Date.now() - parsed.startedAt >= PURCHASE_INTENT_TTL_MS) return null;
		return { idempotenceKey: parsed.idempotenceKey, startedAt: parsed.startedAt };
	} catch {
		return null;
	}
}

function getPurchaseRequestStorageKeys(userId: string, tierId: string) {
	const prefix = getPurchaseRequestStoragePrefix(userId, tierId);
	return getStoredKeys().filter(key => key.startsWith(prefix));
}

function clearExpiredPurchaseRequests(userId: string, tierId: string) {
	for (const key of getPurchaseRequestStorageKeys(userId, tierId)) {
		if (!parseStoredPurchaseRequest(getStoredValue(key))) {
			removeStoredValue(key);
		}
	}
}

function readPurchaseIntent(userId: string, tierId: string) {
	const storageKey = getPurchaseIntentStorageKey(userId, tierId);
	const intent = parseStoredPurchaseIntent(getStoredValue(storageKey));
	if (intent) return intent;

	removeStoredValue(storageKey);
	clearExpiredPurchaseRequests(userId, tierId);
	return null;
}

function writePurchaseIntent(userId: string, tierId: string, intent: StoredPurchaseIntent) {
	setStoredValue(getPurchaseIntentStorageKey(userId, tierId), JSON.stringify(intent));
}

export function getOrCreatePurchaseIdempotenceKey(userId: string, tierId: string) {
	const existing = readPurchaseIntent(userId, tierId);
	if (existing) return existing.idempotenceKey;

	const intent: StoredPurchaseIntent = {
		idempotenceKey: crypto.randomUUID(),
		createdAt: Date.now(),
	};
	writePurchaseIntent(userId, tierId, intent);
	return intent.idempotenceKey;
}

export function startPurchaseRequest(userId: string, tierId: string): PurchaseRequestLease | null {
	const intent = readPurchaseIntent(userId, tierId);
	if (!intent) return null;

	const requestId = crypto.randomUUID();
	setStoredValue(
		`${getPurchaseRequestStoragePrefix(userId, tierId)}${requestId}`,
		JSON.stringify({ idempotenceKey: intent.idempotenceKey, startedAt: Date.now() } satisfies StoredPurchaseRequest),
	);

	return { userId, tierId, idempotenceKey: intent.idempotenceKey, requestId };
}

export function finishPurchaseRequest(lease: PurchaseRequestLease, succeeded: boolean) {
	const intentStorageKey = getPurchaseIntentStorageKey(lease.userId, lease.tierId);
	const intent = parseStoredPurchaseIntent(getStoredValue(intentStorageKey));
	if (succeeded && intent?.idempotenceKey === lease.idempotenceKey) {
		writePurchaseIntent(lease.userId, lease.tierId, { ...intent, clearWhenIdle: true });
	}

	const requestStorageKey = `${getPurchaseRequestStoragePrefix(lease.userId, lease.tierId)}${lease.requestId}`;
	removeStoredValue(requestStorageKey);
	clearExpiredPurchaseRequests(lease.userId, lease.tierId);

	const hasMatchingRequestInFlight = getPurchaseRequestStorageKeys(lease.userId, lease.tierId).some(key => {
		return parseStoredPurchaseRequest(getStoredValue(key))?.idempotenceKey === lease.idempotenceKey;
	});
	if (hasMatchingRequestInFlight) return;

	const currentIntent = parseStoredPurchaseIntent(getStoredValue(intentStorageKey));
	if (currentIntent?.idempotenceKey === lease.idempotenceKey && currentIntent.clearWhenIdle) {
		removeStoredValue(intentStorageKey);
	}
}
