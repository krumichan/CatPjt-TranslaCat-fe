"use client";

import { useState } from "react";

import { initialLearningEvidenceFilter } from "@/features/language-learning/history/evidenceQuery";
import { useQuery } from "@/hooks/useQuery";
import { learningEvidenceService } from "@/services/language-learning/learningEvidenceService";
import type { LearningEvidenceFilter } from "@/types/language-learning/historyEvidence";

export function useLearningEvidenceController() {
    const [filter, setFilter] = useState(initialLearningEvidenceFilter);
    const [draft, setDraft] = useState(filter);
    const [cursors, setCursors] = useState<(string | null)[]>([null]);
    const cursor = cursors[cursors.length - 1];
    const query = useQuery({
        keys: ["language-learning-evidence", JSON.stringify(filter), cursor ?? ""] as const,
        fetcher: () => learningEvidenceService.getPage(filter, cursor),
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    function applyFilter() {
        // 필터 제출 시 이전 페이지 커서를 버린다. 새 문제 생성이나 저장 작업은 수행하지 않는다.
        setFilter({ ...draft });
        setCursors([null]);
    }

    function updateDraft<K extends keyof LearningEvidenceFilter>(key: K, value: LearningEvidenceFilter[K]) {
        setDraft((previous) => ({ ...previous, [key]: value }));
    }

    return {
        draft,
        page: query.data,
        isLoading: query.isLoading,
        error: query.isError,
        hasPrevious: cursors.length > 1,
        updateDraft,
        applyFilter,
        reload: () => query.mutate(undefined, true),
        previous: () => setCursors((previous) => previous.length > 1 ? previous.slice(0, -1) : previous),
        next: () => {
            if (query.data?.nextCursor) setCursors((previous) => [...previous, query.data!.nextCursor]);
        },
    };
}
