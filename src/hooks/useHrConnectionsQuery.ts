// src/hooks/useHrConnectionsQuery.ts
// Хук получения списка HR-коннектов с фильтрами из URL + автоподстановка student_user_id для обычных пользователей

import { HrConnectionsApi, type BaseHrConnectionDto, type HrStatus } from "@/api/hrConnectionsApi";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "./useAuth";

export type HrConnectionsFilters = {
	status?: HrStatus;
	name?: string;
	student_user_id?: string;
};

export function useHrConnectionsQuery() {
	const [params, setParams] = useSearchParams();
	const { user: me, loading: meLoading } = useAuth();
	const isAdmin = me?.role === "admin";

	const urlFilters: HrConnectionsFilters = useMemo(() => {
		const status = params.get("status") as HrStatus | null;
		const name = params.get("name");
		const student_user_id = params.get("student_user_id");
		const f: HrConnectionsFilters = {};
		if (status) f.status = status;
		if (name) f.name = name;
		if (student_user_id) f.student_user_id = student_user_id;
		return f;
	}, [params]);

	// Если пользователь не админ — принудительно подставляем его id
	const effectiveFilters: HrConnectionsFilters = useMemo(() => {
		if (!me || isAdmin) return urlFilters;
		return { ...urlFilters, student_user_id: me.id };
	}, [urlFilters, me, isAdmin]);

	const query = useQuery<BaseHrConnectionDto[]>({
		queryKey: ["hr-connections", effectiveFilters],
		queryFn: () => HrConnectionsApi.list(effectiveFilters),
		enabled: !meLoading && !!me, // ждём пользователя, чтобы корректно проставить фильтры
		staleTime: 60_000,
	});

	function setFilters(next: HrConnectionsFilters) {
		const newParams = new URLSearchParams(params);
		const entries = Object.entries(next) as [keyof HrConnectionsFilters, string | undefined][];
		for (const [key, val] of entries) {
			if (val === undefined || val === null || val === "") newParams.delete(key);
			else newParams.set(key, String(val));
		}
		// Не даём обычному пользователю руками менять student_user_id в URL
		if (me && !isAdmin) {
			newParams.set("student_user_id", me.id);
		}
		setParams(newParams, { replace: true });
	}

	return {
		filters: effectiveFilters,
		rawUrlFilters: urlFilters,
		isAdmin,
		query,
		setFilters,
	};
}
