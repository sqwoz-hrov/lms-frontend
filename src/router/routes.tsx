// src/router/routes.tsx
import { Navbar } from "@/components/layout/Navbar";
import { LoginPage } from "@/pages/Auth/LoginPage";
import ListHrConnectionsPage from "@/pages/HrConnections/ListHrConnections";
import { CreateMaterialPage } from "@/pages/Materials/CreateMaterialPage";
import { ListMaterialsPage } from "@/pages/Materials/ListMaterialsPage";
import { ViewMaterial } from "@/pages/Materials/ViewMaterialPage";
import { CreateSubjectPage } from "@/pages/Subjects/CreateSubjectPage";
import { ListSubjectsPage } from "@/pages/Subjects/ListSubjectsPage";
import { CreateTaskPage } from "@/pages/Tasks/CreateTaskPage";
import { ListTasksPage } from "@/pages/Tasks/ListTasksPage";
import { CreateUserPage } from "@/pages/Users/CreateUserPage";
import { ListUsersPage } from "@/pages/Users/ListUsersPage";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { HomeGate } from "./components/HomeGate";
import { PublicOnly } from "./components/PublicOnly";

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

				{/* приватные роуты */}
				<Route element={<ProtectedRoute />}>
					<Route path="/materials" element={<ListMaterialsPage />} />
					<Route path="/materials/:id" element={<ViewMaterial />} />
					<Route path="/subjects" element={<ListSubjectsPage />} />
					<Route path="/tasks" element={<ListTasksPage />} />
					<Route path="/hr-connections" element={<ListHrConnectionsPage />} />
				</Route>

				{/* только для админов */}
				<Route element={<AdminRoute />}>
					<Route path="/materials/new" element={<CreateMaterialPage />} />
					<Route path="/subjects/new" element={<CreateSubjectPage />} />
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
