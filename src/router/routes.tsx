// src/router/routes.tsx
import { Navbar } from "@/components/layout/Navbar";
import { LoginPage } from "@/pages/Auth/LoginPage";
import { SignupPage } from "@/pages/Auth/SignupPage";
import ListHrConnectionsPage from "@/pages/HrConnections/ListHrConnections";
import { UpsertMaterialPage } from "@/pages/Materials/MaterialUpsertPage";
import { ListMaterialsPage } from "@/pages/Materials/ListMaterialsPage";
import { ViewMaterial } from "@/pages/Materials/ViewMaterialPage";
import { SubjectUpsertPage } from "@/pages/Subjects/SubjectUpsertPage";
import { ListSubjectsPage } from "@/pages/Subjects/ListSubjectsPage";
import { CreateTaskPage } from "@/pages/Tasks/CreateTaskPage";
import { ListTasksPage } from "@/pages/Tasks/ListTasksPage";
import { CreateUserPage } from "@/pages/Users/CreateUserPage";
import { ListUsersPage } from "@/pages/Users/ListUsersPage";
import { SubscriptionPage } from "@/pages/Subscription/SubscriptionPage";
import { ListSubscriptionTiersPage } from "@/pages/Subscription/ListSubscriptionTiersPage";
import { SubscriptionTierUpsertPage } from "@/pages/Subscription/SubscriptionTierUpsertPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";
import { PostUpsertPage } from "@/pages/Posts/PostUpsertPage";
import { ListPostsPage } from "@/pages/Posts/ListPostsPage";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { HomeGate } from "./components/HomeGate";
import { PublicOnly } from "./components/PublicOnly";
import { NonSubscriberRoute } from "./components/NonSubscriberRoute";

export function AppRoutes() {
	return (
		<>
			<Navbar />
			<Routes>
				{/* при заходе на "/" решаем, куда отправить */}
				<Route path="/" element={<HomeGate />} />

				{/* страница логина доступна только гостям */}
				<Route
					path="/login"
					element={
						<PublicOnly to="/tasks">
							<LoginPage />
						</PublicOnly>
					}
				/>
				<Route
					path="/signup"
					element={
						<PublicOnly to="/tasks">
							<SignupPage />
						</PublicOnly>
					}
				/>

				{/* приватные роуты */}
				<Route element={<ProtectedRoute />}>
					<Route path="/posts" element={<ListPostsPage />} />
					<Route path="/materials" element={<ListMaterialsPage />} />
					<Route path="/materials/:id" element={<ViewMaterial />} />
					<Route path="/subjects" element={<ListSubjectsPage />} />
					<Route path="/subscription" element={<SubscriptionPage />} />
					<Route path="/settings" element={<SettingsPage />} />
				</Route>

				<Route element={<NonSubscriberRoute />}>
					<Route path="/tasks" element={<ListTasksPage />} />
					<Route path="/hr-connections" element={<ListHrConnectionsPage />} />
				</Route>

				{/* только для админов */}
				<Route element={<AdminRoute />}>
					<Route path="/subscription-tiers" element={<ListSubscriptionTiersPage />} />
					<Route path="/subscription-tiers/new" element={<SubscriptionTierUpsertPage />} />
					<Route path="/subscription-tiers/:id/edit" element={<SubscriptionTierUpsertPage />} />
					<Route path="/materials/new" element={<UpsertMaterialPage />} />
					<Route path="/materials/:id/edit" element={<UpsertMaterialPage />} />
					<Route path="/subjects/new" element={<SubjectUpsertPage />} />
					<Route path="/subjects/:id/edit" element={<SubjectUpsertPage />} />
					<Route path="/posts/new" element={<PostUpsertPage />} />
					<Route path="/posts/:id/edit" element={<PostUpsertPage />} />
					<Route path="/users" element={<ListUsersPage />} />
					<Route path="/users/new" element={<CreateUserPage />} />
					<Route path="/tasks/new" element={<CreateTaskPage />} />
				</Route>

				{/* fallback */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</>
	);
}
