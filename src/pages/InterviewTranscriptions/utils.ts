const VIDEO_PHASE_LABELS: Record<string, string> = {
	receiving: "получаем файл",
	uploading_s3: "загрузка в хранилище",
	converting: "конвертация",
	hashing: "подсчёт хэша",
	uploading: "загрузка",
	processing: "обработка",
	completed: "готово",
	failed: "ошибка",
};

export function formatDateTime(value: string) {
	try {
		return new Date(value).toLocaleString();
	} catch {
		return value;
	}
}

export function formatFileSizeFromString(size?: string | null) {
	if (!size) return null;
	const bytes = Number(size);
	if (!Number.isFinite(bytes) || bytes <= 0) return null;
	const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
	const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
	const formatted = (bytes / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 1);
	return `${formatted} ${units[idx]}`;
}

export function describeVideoPhase(phase?: string | null) {
	if (!phase) return "—";
	return VIDEO_PHASE_LABELS[phase] ?? phase;
}
