import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type ButtonVariant = ComponentProps<typeof Button>["variant"];

export type ConfirmActionDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	onConfirm: () => void | Promise<void>;
	confirmLabel?: ReactNode;
	cancelLabel?: ReactNode;
	confirmIcon?: ReactNode;
	confirmVariant?: ButtonVariant;
	pending?: boolean;
	confirmDisabled?: boolean;
};

export function ConfirmActionDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
	confirmLabel = "Продолжить",
	cancelLabel = "Отмена",
	confirmIcon,
	confirmVariant = "default",
	pending = false,
	confirmDisabled = false,
}: ConfirmActionDialogProps) {
	const isConfirmDisabled = pending || confirmDisabled;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton={!pending}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>

				<DialogFooter>
					<DialogClose asChild disabled={pending}>
						<Button variant="secondary" disabled={pending}>
							{cancelLabel}
						</Button>
					</DialogClose>
					<Button
						variant={confirmVariant}
						onClick={() => {
							void onConfirm();
						}}
						disabled={isConfirmDisabled}
					>
						{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : confirmIcon}
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
