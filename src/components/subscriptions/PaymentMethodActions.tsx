import { useState, type ComponentProps } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PaymentsApi, type PaymentMethodResponseDto } from "@/api/paymentsApi";
import { ConfirmDeletionDialog } from "@/components/common/dialogs/ConfirmDeletionDialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PAYMENT_METHOD_QUERY_KEY } from "@/pages/Subscription/subscriptionHelpers";

type PaymentMethodActionsProps = {
	paymentMethod?: PaymentMethodResponseDto | null;
	size?: ComponentProps<typeof Button>["size"];
	variant?: ComponentProps<typeof Button>["variant"];
	changeLabel?: string;
	addLabel?: string;
};

export function PaymentMethodActions({
	paymentMethod,
	size,
	variant = "outline",
	changeLabel = "Изменить",
	addLabel = "Добавить",
}: PaymentMethodActionsProps) {
	const queryClient = useQueryClient();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	const addPaymentMethodMutation = useMutation({
		mutationFn: PaymentsApi.addPaymentMethod,
		onMutate: () => setActionError(null),
		onSuccess: data => {
			if (data?.confirmation_url) {
				window.location.assign(data.confirmation_url);
				return;
			}
			setActionError("Не удалось получить ссылку на изменение способа оплаты. Попробуйте снова.");
		},
		onError: () => setActionError("Не удалось открыть изменение способа оплаты. Попробуйте позже."),
	});

	const deletePaymentMethodMutation = useMutation({
		mutationFn: PaymentsApi.deletePaymentMethod,
		onMutate: () => setActionError(null),
		onSuccess: async () => {
			setDeleteDialogOpen(false);
			queryClient.setQueryData(PAYMENT_METHOD_QUERY_KEY, null);
			toast.success(
				"Способ оплаты отвязан. Уже оплаченный доступ сохранится до конца периода, а дальше переведём вас на бесплатный уровень",
			);
			await queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEY });
		},
		onError: () => setActionError("Не удалось удалить способ оплаты. Попробуйте позже."),
		onSettled: () => setDeleteDialogOpen(false),
	});
	const pending = addPaymentMethodMutation.isPending || deletePaymentMethodMutation.isPending;

	return (
		<div className="flex flex-col items-start gap-2">
			<div className="flex flex-wrap gap-2">
				<Button size={size} variant={variant} disabled={pending} onClick={() => addPaymentMethodMutation.mutate()}>
					{addPaymentMethodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
					{paymentMethod ? changeLabel : addLabel}
				</Button>
				{paymentMethod && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button size={size} variant="outline" disabled={pending} onClick={() => setDeleteDialogOpen(true)}>
								Отвязать
							</Button>
						</TooltipTrigger>
						<TooltipContent>Уже оплаченный доступ сохранится до конца периода</TooltipContent>
					</Tooltip>
				)}
			</div>
			{actionError && (
				<p role="alert" className="max-w-sm text-sm text-destructive">
					{actionError}
				</p>
			)}

			<ConfirmDeletionDialog
				entityName="способ оплаты"
				description="Сохранённый способ оплаты будет отвязан. Уже оплаченная подписка продолжит работать до конца периода."
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={() => {
					if (paymentMethod && !pending) deletePaymentMethodMutation.mutate();
				}}
				pending={deletePaymentMethodMutation.isPending}
			/>
		</div>
	);
}
