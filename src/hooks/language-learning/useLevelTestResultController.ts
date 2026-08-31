"use client";

import { useQuery } from "@/hooks/useQuery";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";

export function useLevelTestResultController(sessionId: number) {
    const resultQuery = useQuery({
        keys: ["language-learning-level-result", sessionId] as const,
        fetcher: (_key, id) => languageLearningLevelService.getResult(id),
        enabled: Number.isFinite(sessionId) && sessionId > 0,
        config: { revalidateOnMount: true },
    });

    return {
        result: resultQuery.data ?? null,
        isLoading: resultQuery.isLoading,
        loadError: resultQuery.isError,
        reload: () => resultQuery.mutate((current) => current, true),
    };
}
