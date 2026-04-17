import apiClient from "./client";

export const LIMITABLE_RESOURCES = ["interview_transcription"] as const;
export type LimitableResource = (typeof LIMITABLE_RESOURCES)[number];

export const LIMIT_PERIODS = ["daily", "hourly"] as const;
export type LimitPeriod = (typeof LIMIT_PERIODS)[number];

export type LimitDto = {
	feature: LimitableResource;
	period: LimitPeriod;
	limit: number;
	name: string;
};

export type LimitsResponseDto = {
	applied: LimitDto[];
	exceeded: LimitDto[];
};

const LIMITS = "/limits";

export async function getLimits(): Promise<LimitsResponseDto> {
	const res = await apiClient.get<LimitsResponseDto>(LIMITS);
	return res.data;
}

export const LimitsApi = {
	getLimits,
};
