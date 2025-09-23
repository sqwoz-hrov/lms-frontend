// src/hooks/usePermissions.ts
// Хук-обёртка вокруг чистых функций + текущего пользователя

import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import {
	canCRUDFeedback as _canCRUDFeedback,
	canCRUDHrConnection as _canCRUDHrConnection,
	canCRUDInterview as _canCRUDInterview,
	canSeeFeedback as _canSeeFeedback,
	canSeeHrConnection as _canSeeHrConnection,
	isAdmin as _isAdmin,
	isOwner as _isOwner,
	type PermissionBundle,
} from "@/utils/permissions";
import { UserResponse } from "../api/usersApi";
import { useAuth } from "./useAuth";

export function usePermissions(): PermissionBundle & { me: UserResponse | undefined } {
	const { user: me } = useAuth();

	return {
		me,
		isAdmin: _isAdmin(me),
		isOwner: (conn?: BaseHrConnectionDto | null) => _isOwner(me, conn),
		canSeeHrConnection: (conn: BaseHrConnectionDto) => _canSeeHrConnection(me, conn),
		canCRUDHrConnection: (conn: BaseHrConnectionDto) => _canCRUDHrConnection(me, conn),
		canCRUDInterview: (parentConn: BaseHrConnectionDto) => _canCRUDInterview(me, parentConn),
		canSeeFeedback: () => _canSeeFeedback(me),
		canCRUDFeedback: () => _canCRUDFeedback(me),
	};
}
