import { TasksApi } from "@/api/tasksApi";
import { serverToLocal, localToServer, STATUS_STORAGE_KEY, type StatusMap } from "./constants";

// ------ helpers для локального кэша ------
export function readLocalCache(): StatusMap {
	try {
		const raw = localStorage.getItem(STATUS_STORAGE_KEY);
		return raw ? (JSON.parse(raw) as StatusMap) : {};
	} catch {
		return {};
	}
}

export function writeLocalCache(map: StatusMap) {
	try {
		localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(map));
	} catch {
		// ignore
	}
}

/** Загружает статус-карту с сервера (и обновляет локальный кэш). */
export async function loadStatusMap(filters?: {
	student_user_id?: string;
	mentor_user_id?: string;
}): Promise<StatusMap> {
	try {
		const tasks = await TasksApi.list(filters);
		const serverMap: StatusMap = {};
		for (const t of tasks) {
			const local = serverToLocal[t.status] ?? "todo";
			serverMap[t.id] = local;
		}
		writeLocalCache(serverMap);
		return serverMap;
	} catch {
		return readLocalCache();
	}
}

/** Сохраняет статусы на сервере (bulk через Promise.all) и обновляет локальный кэш. */
export async function saveStatusMap(map: StatusMap): Promise<void> {
	const ops = Object.entries(map).map(([id, localStatus]) => {
		const serverStatus = localToServer[localStatus];
		if (!serverStatus) return Promise.resolve();
		return TasksApi.changeStatus({ id, status: serverStatus });
	});

	try {
		await Promise.all(ops);
	} finally {
		writeLocalCache(map);
	}
}

/** Обновление одного таска. */
export async function saveSingleStatus(taskId: string, localStatus: StatusMap[string]): Promise<void> {
	const cache = readLocalCache();
	cache[taskId] = localStatus;
	writeLocalCache(cache);

	const serverStatus = localToServer[localStatus];
	if (!serverStatus) return;

	await TasksApi.changeStatus({ id: taskId, status: serverStatus });
}
