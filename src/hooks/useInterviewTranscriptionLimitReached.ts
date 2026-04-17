import { LimitsApi } from "@/api/limitsApi";
import { useQuery } from "@tanstack/react-query";

export function useInterviewTranscriptionLimitReached() {
	const limitsQuery = useQuery({
		queryKey: ["limits"],
		queryFn: LimitsApi.getLimits,
		staleTime: 30_000,
		retry: 1,
	});

    const exceededLimits = limitsQuery.data?.exceeded;
	const isLimitReached = Boolean(
        exceededLimits?.some(limit => limit.feature === "interview_transcription"),
	);

	return {
		isLimitReached,
        whichExceeded: exceededLimits,
		limitsQuery,
	};
}
