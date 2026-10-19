/// <reference types="node" />

import assert from "node:assert/strict";
import { test } from "node:test";

type PurchaseIdempotenceModule = typeof import("./purchaseIdempotence");

class MemoryStorage implements Storage {
	readonly values = new Map<string, string>();

	get length() {
		return this.values.size;
	}

	clear() {
		this.values.clear();
	}

	getItem(key: string) {
		return this.values.get(key) ?? null;
	}

	key(index: number) {
		return [...this.values.keys()][index] ?? null;
	}

	removeItem(key: string) {
		this.values.delete(key);
	}

	setItem(key: string, value: string) {
		this.values.set(key, value);
	}
}

function useLocalStorage(storage: Storage) {
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: storage,
	});
}

function useUnavailableLocalStorage() {
	useLocalStorage({
		get length(): number {
			throw new Error("localStorage is unavailable");
		},
		clear() {
			throw new Error("localStorage is unavailable");
		},
		getItem() {
			throw new Error("localStorage is unavailable");
		},
		key() {
			throw new Error("localStorage is unavailable");
		},
		removeItem() {
			throw new Error("localStorage is unavailable");
		},
		setItem() {
			throw new Error("localStorage is unavailable");
		},
	});
}

let moduleNumber = 0;

async function loadIsolatedModule() {
	moduleNumber += 1;
	return import(`./purchaseIdempotence.ts?test-module=${moduleNumber}`) as Promise<PurchaseIdempotenceModule>;
}

test("reuses an intent for the same user and tier across tabs", async () => {
	useLocalStorage(new MemoryStorage());
	const firstTab = await loadIsolatedModule();
	const secondTab = await loadIsolatedModule();

	const key = firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");

	assert.equal(firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), key);
	assert.equal(secondTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), key);
	assert.notEqual(firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-2"), key);
	assert.notEqual(firstTab.getOrCreatePurchaseIdempotenceKey("user-2", "tier-1"), key);
});

test("does not start a request lease without an existing purchase intent", async () => {
	useLocalStorage(new MemoryStorage());
	const purchaseIdempotence = await loadIsolatedModule();

	assert.equal(purchaseIdempotence.startPurchaseRequest("user-1", "tier-1"), null);
});

test("shares an intent between concurrent cross-tab request leases", async () => {
	useLocalStorage(new MemoryStorage());
	const firstTab = await loadIsolatedModule();
	const secondTab = await loadIsolatedModule();
	const key = firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");

	const firstLease = firstTab.startPurchaseRequest("user-1", "tier-1");
	const secondLease = secondTab.startPurchaseRequest("user-1", "tier-1");

	assert.ok(firstLease);
	assert.ok(secondLease);
	assert.equal(firstLease.idempotenceKey, key);
	assert.equal(secondLease.idempotenceKey, key);
	assert.notEqual(firstLease.requestId, secondLease.requestId);
});

test("retains the intent when every request fails", async () => {
	useLocalStorage(new MemoryStorage());
	const purchaseIdempotence = await loadIsolatedModule();
	const key = purchaseIdempotence.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");
	const firstLease = purchaseIdempotence.startPurchaseRequest("user-1", "tier-1");
	const secondLease = purchaseIdempotence.startPurchaseRequest("user-1", "tier-1");

	assert.ok(firstLease);
	assert.ok(secondLease);
	purchaseIdempotence.finishPurchaseRequest(firstLease, false);
	purchaseIdempotence.finishPurchaseRequest(secondLease, false);

	assert.equal(purchaseIdempotence.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), key);
});

test("clears a successful intent only after all matching leases settle", async () => {
	useLocalStorage(new MemoryStorage());
	const firstTab = await loadIsolatedModule();
	const secondTab = await loadIsolatedModule();
	const key = firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");
	const successfulLease = firstTab.startPurchaseRequest("user-1", "tier-1");
	const concurrentLease = secondTab.startPurchaseRequest("user-1", "tier-1");

	assert.ok(successfulLease);
	assert.ok(concurrentLease);
	firstTab.finishPurchaseRequest(successfulLease, true);
	assert.equal(secondTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), key);

	secondTab.finishPurchaseRequest(concurrentLease, false);
	assert.notEqual(secondTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), key);
});

test("clears an intent immediately after its only lease succeeds", async () => {
	useLocalStorage(new MemoryStorage());
	const purchaseIdempotence = await loadIsolatedModule();
	const key = purchaseIdempotence.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");
	const lease = purchaseIdempotence.startPurchaseRequest("user-1", "tier-1");

	assert.ok(lease);
	purchaseIdempotence.finishPurchaseRequest(lease, true);

	assert.notEqual(purchaseIdempotence.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), key);
});

test("exposes another tab's completed purchase as a missing intent", async () => {
	useLocalStorage(new MemoryStorage());
	const purchasingTab = await loadIsolatedModule();
	const observingTab = await loadIsolatedModule();
	purchasingTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");
	const lease = purchasingTab.startPurchaseRequest("user-1", "tier-1");

	assert.ok(lease);
	purchasingTab.finishPurchaseRequest(lease, true);

	assert.equal(observingTab.startPurchaseRequest("user-1", "tier-1"), null);
});

test("replaces expired intents and ignores expired leases", async () => {
	const storage = new MemoryStorage();
	useLocalStorage(storage);
	const purchaseIdempotence = await loadIsolatedModule();
	const intentStorageKey = "lms:subscription-purchase:user-1:tier-1";
	storage.setItem(intentStorageKey, JSON.stringify({ idempotenceKey: "expired-key", createdAt: 0 }));
	storage.setItem(
		`${intentStorageKey}:in-flight:expired-request`,
		JSON.stringify({ idempotenceKey: "expired-key", startedAt: 0 }),
	);

	const currentKey = purchaseIdempotence.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");
	assert.notEqual(currentKey, "expired-key");
	assert.equal(storage.getItem(`${intentStorageKey}:in-flight:expired-request`), null);

	const lease = purchaseIdempotence.startPurchaseRequest("user-1", "tier-1");
	assert.ok(lease);
	storage.setItem(
		`${intentStorageKey}:in-flight:another-expired-request`,
		JSON.stringify({ idempotenceKey: currentKey, startedAt: 0 }),
	);
	purchaseIdempotence.finishPurchaseRequest(lease, true);

	assert.equal(purchaseIdempotence.startPurchaseRequest("user-1", "tier-1"), null);
});

test("uses tab-scoped storage when localStorage is unavailable", async () => {
	useUnavailableLocalStorage();
	const firstTab = await loadIsolatedModule();
	const secondTab = await loadIsolatedModule();
	const firstTabKey = firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1");

	assert.equal(firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), firstTabKey);
	assert.equal(secondTab.startPurchaseRequest("user-1", "tier-1"), null);
	assert.notEqual(secondTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), firstTabKey);

	const failedLease = firstTab.startPurchaseRequest("user-1", "tier-1");
	assert.ok(failedLease);
	firstTab.finishPurchaseRequest(failedLease, false);
	assert.equal(firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), firstTabKey);

	const successfulLease = firstTab.startPurchaseRequest("user-1", "tier-1");
	assert.ok(successfulLease);
	firstTab.finishPurchaseRequest(successfulLease, true);
	assert.notEqual(firstTab.getOrCreatePurchaseIdempotenceKey("user-1", "tier-1"), firstTabKey);
});
