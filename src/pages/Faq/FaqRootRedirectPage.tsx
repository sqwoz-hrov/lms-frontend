import { Navigate } from "react-router-dom";
import { getFaqFirstArticleRoute } from "@/faq/catalog";

export function FaqRootRedirectPage() {
	const firstArticleRoute = getFaqFirstArticleRoute();

	if (!firstArticleRoute) {
		return <Navigate to="/" replace />;
	}

	return <Navigate to={firstArticleRoute} replace />;
}
