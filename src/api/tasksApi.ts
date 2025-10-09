// src/api/tasksApi.ts
// Работа с задачами: POST/PUT/DELETE/GET /tasks, GET /tasks/{id}, PUT /tasks/change-status

import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

export type CreateTaskDto = {
	student_user_id: string;
	mentor_user_id: string;
	summary: string;
	markdown_content: string;
	deadline: string; // ISO date-time
	priority: number;
	status: TaskStatus;
};

export type CreateTaskForMultipleStudentsDto = {
	mentor_user_id: string;
	summary: string;
	markdown_content: string;
	deadline: string; // ISO date-time
	priority: number;
	status: TaskStatus;
	student_user_ids: string[];
};

export type TaskResponseDto = {
	id: string;
	student_user_id: string;
	mentor_user_id: string;
	summary: string;
	markdown_content_id: string;
	markdown_content: string;
	deadline: string; // ISO date-time
	created_at: string; // ISO date-time
	priority: number;
	status: TaskStatus;
};

export type UpdateTaskDto = {
	id: string;
	student_user_id?: string;
	mentor_user_id?: string;
	summary?: string;
	markdown_content_id?: string;
	markdown_content?: string;
	deadline?: string; // ISO date-time
	created_at?: string; // ISO date-time (по схеме присутствует, лучше не отправлять без надобности)
	priority?: number;
	status?: TaskStatus;
};

export type DeleteTaskDto = {
	id: string;
};

export type ChangeTaskStatusDto = {
	id: string;
	status: TaskStatus;
};

// ===== API =====
const TASKS = "/tasks";
const TASKS_CREATE_FOR_MULTIPLE = `${TASKS}/create-for-multiple-students`;

/**
 * Создает задачу
 * POST /tasks
 */
export async function createTask(data: CreateTaskDto): Promise<TaskResponseDto> {
	const res = await apiClient.post<TaskResponseDto>(TASKS, data);
	return res.data;
}

/**
 * Создает задачи для нескольких студентов
 * POST /tasks/create-for-multiple-students
 */
export async function createTasksForMultipleStudents(
	data: CreateTaskForMultipleStudentsDto,
): Promise<TaskResponseDto[]> {
	const res = await apiClient.post<TaskResponseDto[]>(TASKS_CREATE_FOR_MULTIPLE, data);
	return res.data;
}

/**
 * Обновляет задачу
 * PUT /tasks
 */
export async function updateTask(data: UpdateTaskDto): Promise<TaskResponseDto> {
	const res = await apiClient.put<TaskResponseDto>(TASKS, data);
	return res.data;
}

/**
 * Меняет статус задачи
 * PUT /tasks/change-status
 */
export async function changeTaskStatus(data: ChangeTaskStatusDto): Promise<TaskResponseDto> {
	const res = await apiClient.put<TaskResponseDto>(`${TASKS}/change-status`, data);
	return res.data;
}

/**
 * Удаляет задачу
 * DELETE /tasks (body: { id })
 */
export async function deleteTask(id: string): Promise<TaskResponseDto> {
	const res = await apiClient.delete<TaskResponseDto>(TASKS, {
		data: { id } as DeleteTaskDto,
	});
	return res.data;
}

/**
 * Получает список задач
 * GET /tasks?student_user_id=&mentor_user_id=
 */
export async function getTasks(params?: {
	student_user_id?: string;
	mentor_user_id?: string;
}): Promise<TaskResponseDto[]> {
	const res = await apiClient.get<TaskResponseDto[]>(TASKS, { params });
	return res.data;
}

/**
 * Получает информацию о задаче
 * GET /tasks/{id}
 */
export async function getTaskById(id: string): Promise<TaskResponseDto> {
	const res = await apiClient.get<TaskResponseDto>(`${TASKS}/${id}`);
	return res.data;
}

// Удобный агрегатор
export const TasksApi = {
	create: createTask,
	createForMultipleStudents: createTasksForMultipleStudents,
	update: updateTask,
	changeStatus: changeTaskStatus,
	remove: deleteTask,
	list: getTasks,
	getById: getTaskById,
};
