import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { ConfirmActionDialog, type ConfirmActionDialogProps } from "./ConfirmActionDialog";

export type ConfirmDeletionDialogProps = Omit<ConfirmActionDialogProps, "title" | "confirmVariant" | "confirmIcon"> & {
	title?: ReactNode;
	description?: ReactNode;
	entityName?: string;
};

export function ConfirmDeletionDialog({
	title,
	description,
	entityName = "элемент",
	confirmLabel = "Удалить",
	...rest
}: ConfirmDeletionDialogProps) {
	const resolvedTitle = title ?? `Удалить ${entityName}?`;
	const resolvedDescription = description ?? "Это действие нельзя отменить.";

	return (
		<ConfirmActionDialog
			{...rest}
			title={resolvedTitle}
			description={resolvedDescription}
			confirmLabel={confirmLabel}
			confirmIcon={<Trash2 className="mr-2 h-4 w-4" />}
			confirmVariant="destructive"
		/>
	);
}
