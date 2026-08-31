"use client";

import { useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import type { LevelTestSessionType } from "@/types/language-learning/common";

export type LevelTestHistoryFilter = "ALL" | LevelTestSessionType;

export function useLevelTestHistoryController() {
    const query = useQuery({
        keys: ["language-learning-level-history"] as const,
        fetcher: () => languageLearningLevelService.getHistory(),
        config: { revalidateOnMount: true },
    });
    const [filter, setFilter] = useState<LevelTestHistoryFilter>("ALL");
    const items = useMemo(() => {
        const values = query.data ?? [];
        return filter === "ALL"
            ? values
            : values.filter((item) => item.sessionType === filter);
    }, [filter, query.data]);

    return {
        items,
        filter,
        setFilter,
        isLoading: query.isLoading,
        loadError: query.isError,
        reload: () => query.mutate((current) => current, true),
    };
}

export function useLevelTestHistoryDetailController(sessionId: number) {
    const query = useQuery({
        keys: ["language-learning-level-history-detail", sessionId] as const,
        fetcher: (_key, id) => languageLearningLevelService.getHistoryDetail(id),
        enabled: Number.isFinite(sessionId) && sessionId > 0,
        config: { revalidateOnMount: true },
    });

    return {
        detail: query.data ?? null,
        isLoading: query.isLoading,
        loadError: query.isError,
        reload: () => query.mutate((current) => current, true),
    };
}
