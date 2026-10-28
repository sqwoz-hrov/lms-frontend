import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCcw } from "lucide-react";

import { PaymentsApi } from "@/api/paymentsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime, formatPrice } from "./subscriptionHelpers";

const PAGE_SIZE = 20;

export function SubscriptionPaymentHistoryPage() {
	const { user, userLoading } = useAuth();
	const [page, setPage] = useState(1);

	const {
		data: history,
		isError,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["payments", "history", { page, pageSize: PAGE_SIZE }],
		queryFn: () => PaymentsApi.listHistory({ page, pageSize: PAGE_SIZE }),
		enabled: Boolean(user?.id),
		staleTime: 60_000,
	});

	if (userLoading) {
		return (
			<div className="flex min-h-[200px] items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (user.role !== "subscriber" && user.role !== "admin") {
		return <Navigate to="/materials" replace />;
	}

	const pagination = history?.pagination;
	const hasItems = Boolean(history?.items.length);

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-normal">История операций</h1>
					<p className="mt-1 text-sm text-muted-foreground">Все успешные списания по подписке.</p>
				</div>
				<Button variant="outline" asChild>
					<Link to="/subscription/manage">
						<ArrowLeft className="h-4 w-4" />К управлению
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Списания</CardTitle>
					<CardDescription>
						{pagination ? `Страница ${pagination.page} из ${Math.max(pagination.totalPages, 1)}` : "Загрузка истории"}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					{isLoading && (
						<div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					)}

					{isError && (
						<div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center text-sm">
							<p className="text-destructive">Не удалось загрузить историю операций.</p>
							<Button variant="outline" size="sm" onClick={() => refetch()}>
								<RefreshCcw className="h-4 w-4" />
								Повторить
							</Button>
						</div>
					)}

					{!isLoading && !isError && !hasItems && (
						<div className="flex min-h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
							История списаний пока пуста.
						</div>
					)}

					{!isLoading && !isError && hasItems && (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Дата</TableHead>
									<TableHead>Способ оплаты</TableHead>
									<TableHead className="text-right">Сумма</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history?.items.map((item, index) => (
									<TableRow key={`${item.date}-${index}`}>
										<TableCell>{formatDateTime(item.date) ?? item.date}</TableCell>
										<TableCell>{item.paymentMethodName}</TableCell>
										<TableCell className="text-right font-medium">{formatPrice(item.amount, item.currency)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}

					<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							{pagination ? `Всего операций: ${pagination.totalItems}` : " "}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={!pagination?.hasPreviousPage || isLoading}
								onClick={() => setPage(current => Math.max(current - 1, 1))}
							>
								<ChevronLeft className="h-4 w-4" />
								Назад
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!pagination?.hasNextPage || isLoading}
								onClick={() => setPage(current => current + 1)}
							>
								Вперёд
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
