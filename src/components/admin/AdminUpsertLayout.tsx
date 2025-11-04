// components/admin/AdminUpsertLayout.tsx
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "create" | "edit";

type TitleConfig = {
	create: string;
	edit: string;
};

type AdminUpsertLayoutProps = {
	mode: Mode;
	title: TitleConfig;
	cardTitle?: Partial<TitleConfig>;
	actionSlot?: ReactNode;
	children: ReactNode;
	maxWidthClassName?: string;
};

export function AdminUpsertLayout(props: AdminUpsertLayoutProps) {
	const { mode, title, cardTitle, actionSlot, children, maxWidthClassName = "max-w-3xl" } = props;

	const pageTitle = mode === "edit" ? title.edit : title.create;
	const cardHeading = mode === "edit" ? (cardTitle?.edit ?? "Обновите поля") : (cardTitle?.create ?? "Заполните поля");

	return (
		<div className="container mx-auto px-4 py-6">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
				{actionSlot}
			</div>

			<Card className={maxWidthClassName}>
				<CardHeader>
					<CardTitle className="text-base">{cardHeading}</CardTitle>
				</CardHeader>
				<CardContent>{children}</CardContent>
			</Card>
		</div>
	);
}
