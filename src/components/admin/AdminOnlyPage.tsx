// components/admin/AdminOnlyPage.tsx
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

type AdminOnlyPageProps = {
	children: ReactNode;
	/**
	 * Set to false while page-specific data is still loading.
	 * The guard will keep showing the loading fallback until ready.
	 */
	ready?: boolean;
	deniedMessage: string;
	onBack?: () => void;
	loadingFallback?: ReactNode;
};

export function AdminOnlyPage(props: AdminOnlyPageProps) {
	const { children, ready = true, deniedMessage, onBack, loadingFallback } = props;
	const navigate = useNavigate();
	const { user, loading: userLoading } = useAuth();
	const fallbackContent = loadingFallback ?? "Загрузка…";

	if (userLoading || !ready) {
		return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">{fallbackContent}</div>;
	}

	if (user?.role !== "admin") {
		return (
			<div className="container mx-auto px-4 py-10">
				<Card>
					<CardContent className="py-10 text-center space-y-4">
						<p className="text-sm text-muted-foreground">{deniedMessage}</p>
						<Button variant="secondary" onClick={onBack ?? (() => navigate(-1))}>
							Назад
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return <>{children}</>;
}
