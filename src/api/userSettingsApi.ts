// src/api/userSettingsApi.ts
import apiClient from "./client";

export type ThemePreference = "dark" | "light";

export type UserSettingsDto = {
	theme: ThemePreference;
};

const USERS_SETTINGS = "/users/settings";

export async function updateUserSettings(data: UserSettingsDto): Promise<UserSettingsDto> {
	const res = await apiClient.patch<UserSettingsDto>(USERS_SETTINGS, data);
	return res.data;
}

export const UserSettingsApi = {
	update: updateUserSettings,
};
