import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

export function ConfirmDeleteDialog(props: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onConfirm: () => void;
	pending?: boolean;
}) {
	const { open, onOpenChange, onConfirm, pending } = props;
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Удалить задачу?</DialogTitle>
					<DialogDescription>
						Это действие необратимо. Задача будет удалена без возможности восстановления.
					</DialogDescription>
				</DialogHeader>
				<div className="flex justify-end gap-2">
					<DialogClose asChild>
						<Button variant="secondary">Отмена</Button>
					</DialogClose>
					<Button variant="destructive" onClick={onConfirm} disabled={pending}>
						{pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
						Удалить
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
