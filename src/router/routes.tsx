import { RequireAdmin } from "@/components/auth/RequireAdmin";
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
import type { JSX } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function PrivateRoute({ children }: { children: JSX.Element }) {
	const token = localStorage.getItem("token");
	return token ? children : <Navigate to="/login" />;
}

export function AppRoutes() {
	return (
		<>
			<Navbar />
			<Routes>
				<Route path="/login" element={<LoginPage />} />

				<Route
					path="/materials/new"
					element={
						<RequireAdmin>
							<CreateMaterialPage />
						</RequireAdmin>
					}
				/>

				<Route
					path="/materials/:id"
					element={
						<PrivateRoute>
							<ViewMaterial />
						</PrivateRoute>
					}
				/>

				<Route
					path="/materials"
					element={
						<PrivateRoute>
							<ListMaterialsPage />
						</PrivateRoute>
					}
				/>

				<Route
					path="/subjects"
					element={
						<PrivateRoute>
							<ListSubjectsPage />
						</PrivateRoute>
					}
				/>

				<Route
					path="/subjects/new"
					element={
						<RequireAdmin>
							<CreateSubjectPage />
						</RequireAdmin>
					}
				/>

				<Route
					path="/users"
					element={
						<RequireAdmin>
							<ListUsersPage />
						</RequireAdmin>
					}
				/>

				<Route
					path="/users/new"
					element={
						<RequireAdmin>
							<CreateUserPage />
						</RequireAdmin>
					}
				/>

				<Route
					path="/tasks"
					element={
						<PrivateRoute>
							<ListTasksPage />
						</PrivateRoute>
					}
				/>

				<Route
					path="/tasks/new"
					element={
						<RequireAdmin>
							<CreateTaskPage />
						</RequireAdmin>
					}
				/>

				<Route
					path="/hr-connections"
					element={
						<PrivateRoute>
							<ListHrConnectionsPage />
						</PrivateRoute>
					}
				/>
				<Route path="*" element={<Navigate to="/login" />} />
			</Routes>
		</>
	);
}
