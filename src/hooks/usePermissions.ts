// src/hooks/usePermissions.ts
// Хук-обёртка вокруг чистых функций + текущего пользователя

import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import {
	isAdmin as _isAdmin,
	isOwner as _isOwner,
	canSeeHrConnection as _canSeeHrConnection,
	canCRUDHrConnection as _canCRUDHrConnection,
	canCRUDInterview as _canCRUDInterview,
	canSeeFeedback as _canSeeFeedback,
	canCRUDFeedback as _canCRUDFeedback,
	type PermissionBundle,
} from "@/utils/permissions";

export function usePermissions(): PermissionBundle & { me: ReturnType<typeof useCurrentUser>["data"] } {
	const { data: me } = useCurrentUser();

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
