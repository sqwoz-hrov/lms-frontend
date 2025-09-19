// src/utils/permissions.ts
// Чистые функции для проверки прав и принадлежности сущностей

import type { UserResponse } from "@/api/usersApi";
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";

export function isAdmin(user?: UserResponse | null): boolean {
	return user?.role === "admin";
}

export function isOwner(user: UserResponse | null | undefined, conn?: BaseHrConnectionDto | null): boolean {
	if (!user || !conn) return false;
	return conn.student_user_id === user.id;
}

export function canSeeHrConnection(user: UserResponse | null | undefined, conn: BaseHrConnectionDto): boolean {
	// Любой авторизованный может видеть: админ — все, обычный — только свои
	return !!user && (isAdmin(user) || isOwner(user, conn));
}

export function canCRUDHrConnection(user: UserResponse | null | undefined, conn: BaseHrConnectionDto): boolean {
	// Создавать/изменять/удалять: админ — все, обычный — только свои
	return !!user && (isAdmin(user) || isOwner(user, conn));
}

export function canCRUDInterview(user: UserResponse | null | undefined, parentConn: BaseHrConnectionDto): boolean {
	// Правила такие же, как для HR-коннекта
	return !!user && (isAdmin(user) || isOwner(user, parentConn));
}

export function canSeeFeedback(_user: UserResponse | null | undefined): boolean {
	// Смотреть фидбек может любой авторизованный
	return !!_user;
}

export function canCRUDFeedback(user: UserResponse | null | undefined): boolean {
	// Создавать/менять/удалять фидбек — только админ
	return !!user && isAdmin(user);
}

export type PermissionBundle = {
	isAdmin: boolean;
	isOwner: (conn?: BaseHrConnectionDto | null) => boolean;
	canSeeHrConnection: (conn: BaseHrConnectionDto) => boolean;
	canCRUDHrConnection: (conn: BaseHrConnectionDto) => boolean;
	canCRUDInterview: (parentConn: BaseHrConnectionDto) => boolean;
	canSeeFeedback: () => boolean;
	canCRUDFeedback: () => boolean;
};
