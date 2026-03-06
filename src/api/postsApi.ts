// api/postsApi.ts — CRUD wrapper for /posts
import axios from "axios";
import apiClient from "./client";

// ===== Types (из OpenAPI) =====
export type LockedPostPreviewDto = {
	has_video: boolean;
};

// Backend marks video_id as object in the schema; allow string as well because IDs are usually strings.
export type PostVideoReference = string | Record<string, unknown> | null;

export type PostResponseDto = {
	id: string;
	title: string;
	markdown_content_id: string;
	markdown_content?: string;
	video_id?: PostVideoReference;
	created_at: string; // ISO date-time
	locked_preview?: LockedPostPreviewDto;
	subscription_tier_ids?: string[];
};

export type PostListResponseDto = {
	items: PostResponseDto[];
	next_cursor?: string;
	prev_cursor?: string;
};

export type CreatePostDto = {
	title: string;
	markdown_content: string;
	video_id?: PostVideoReference;
};

export type UpdatePostDto = {
	id: string;
	title?: string;
	markdown_content?: string;
	video_id?: PostVideoReference;
};

export type DeletePostDto = {
	id: string;
};

export type ListPostsParams = {
	after?: string;
	before?: string;
	limit?: number;
	subscription_tier_id?: string;
};

export type OpenPostForTiersDto = {
	tier_ids: string[];
};

// ===== API =====
const POSTS = "/posts";

/**
 * Создает пост
 * POST /posts
 */
export async function createPost(data: CreatePostDto): Promise<PostResponseDto> {
	const res = await apiClient.post<PostResponseDto>(POSTS, data);
	return res.data;
}

/**
 * Обновляет пост
 * PUT /posts
 */
export async function updatePost(data: UpdatePostDto): Promise<PostResponseDto> {
	const res = await apiClient.put<PostResponseDto>(POSTS, data);
	return res.data;
}

/**
 * Удаляет пост
 * DELETE /posts (body: { id })
 */
export async function deletePost(id: string): Promise<PostResponseDto> {
	const res = await apiClient.delete<PostResponseDto>(POSTS, {
		data: { id } as DeletePostDto,
	});
	return res.data;
}

/**
 * Получает список постов
 * GET /posts?after=&before=&limit=&subscription_tier_id=
 */
export async function listPosts(params?: ListPostsParams): Promise<PostListResponseDto> {
	const res = await apiClient.get<PostListResponseDto>(POSTS, { params });
	return res.data;
}

/**
 * Получает пост по id
 * GET /posts/:id
 */
export async function getPostById(id: string): Promise<PostResponseDto | null> {
	try {
		const res = await apiClient.get<PostResponseDto>(`${POSTS}/${id}`);
		return res.data;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 404) {
			return null;
		}
		throw error;
	}
}

export async function openPostForTiers(id: string, data: OpenPostForTiersDto): Promise<Record<string, unknown>> {
	const res = await apiClient.post<Record<string, unknown>>(`${POSTS}/${id}/open-for-tiers`, data);
	return res.data;
}

export const PostsApi = {
	create: createPost,
	update: updatePost,
	remove: deletePost,
	list: listPosts,
	getById: getPostById,
	openForTiers: openPostForTiers,
};
