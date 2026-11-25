"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";

import { createIdempotencyKey } from "@/features/language-learning/listening/idempotency";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { getApiErrorCode } from "@/services/common/responseParser";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import type { LevelTestSessionType } from "@/types/language-learning/common";
import type { LevelSelfSelectRequest, LevelSelfSelectionBand } from "@/types/language-learning/level";

/** 실측과 최초 직접 선택을 실행하고 저장 후 레벨·성장 조회 캐시를 갱신한다. */
export function useLanguageLearningLevelTestController() {
    const router = useRouter();
    const { mutate: mutateCache } = useSWRConfig();
    const statusQuery = useQuery({
        keys: ["language-learning-level-status"] as const,
        fetcher: () => languageLearningLevelService.getStatus(),
        config: { revalidateOnMount: true },
    });
    const historyQuery = useQuery({
        keys: ["language-learning-level-history-preview"] as const,
        fetcher: () => languageLearningLevelService.getHistory(),
        config: { revalidateOnMount: true },
    });

    const [isStarting, setIsStarting] = useState(false);
    const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);
    const selectionRequest = useRef<LevelSelfSelectRequest | null>(null);

    // 再送は同じキーを維持し、初期化後の旧プロファイル・オンボーディングキャッシュを残さない。
    const selfSelect = useCallback(async (band: LevelSelfSelectionBand) => {
        if (isStarting) return false;
        setIsStarting(true);
        setActionErrorCode(null);
        if (selectionRequest.current?.band !== band) {
            selectionRequest.current = { band, idempotencyKey: createIdempotencyKey("level-self-selection") };
        }
        try {
            const session = await languageLearningLevelService.selfSelect(selectionRequest.current);
            await mutateCache(
                (key) => Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("language-learning-"),
                undefined,
                { revalidate: false },
            );
            await Promise.all([
                statusQuery.mutate((current) => current, true),
                historyQuery.mutate((current) => current, true),
            ]);
            router.push(`/language-learning/level-test/result/${session.sessionId}`);
            return true;
        } catch (error) {
            setActionErrorCode(getApiErrorCode(error) ?? "UNKNOWN");
            return false;
        } finally {
            setIsStarting(false);
        }
    }, [historyQuery, isStarting, mutateCache, router, statusQuery]);

    const clearSessionCache = useCallback(
        async (sessionId: number) => {
            await Promise.all([
                mutateCache(
                    ["language-learning-level-session", sessionId],
                    undefined,
                    { revalidate: false },
                ),
                mutateCache(
                    ["language-learning-level-current", sessionId],
                    undefined,
                    { revalidate: false },
                ),
            ]);
        },
        [mutateCache],
    );

    const defaultSessionType: LevelTestSessionType = useMemo(() => {
        return statusQuery.data?.initialLevelTestCompleted
            ? "RECHECK"
            : "INITIAL";
    }, [statusQuery.data?.initialLevelTestCompleted]);

    const start = useCallback(
        async (type: LevelTestSessionType = defaultSessionType) => {
            if (isStarting) return false;

            setIsStarting(true);
            setActionErrorCode(null);
            try {
                const session = await languageLearningLevelService.start({
                    type,
                    idempotencyKey: createIdempotencyKey("level-test-start"),
                });
                await Promise.all([
                    statusQuery.mutate((current) => current, true),
                    clearSessionCache(session.sessionId),
                ]);
                router.push(
                    `/language-learning/level-test/session/${session.sessionId}`,
                );
                return true;
            } catch (error) {
                console.error("Failed to start language learning level test.", error);
                setActionErrorCode(getApiErrorCode(error) ?? "UNKNOWN");
                return false;
            } finally {
                setIsStarting(false);
            }
        },
        [clearSessionCache, defaultSessionType, isStarting, router, statusQuery],
    );

    const resume = useCallback(async () => {
        const sessionId = statusQuery.data?.activeSessionId;
        if (!sessionId) return;
        await clearSessionCache(sessionId);
        router.push(`/language-learning/level-test/session/${sessionId}`);
    }, [clearSessionCache, router, statusQuery.data?.activeSessionId]);

    return {
        status: statusQuery.data ?? null,
        recentHistory: historyQuery.data?.slice(0, 2) ?? [],
        isLoading: statusQuery.isLoading,
        loadError: statusQuery.isError,
        actionErrorCode,
        isStarting,
        defaultSessionType,
        start,
        selfSelect,
        resume,
        reload: async () => {
            await Promise.all([
                statusQuery.mutate((current) => current, true),
                historyQuery.mutate((current) => current, true),
            ]);
        },
    };
}

export type LanguageLearningLevelTestController = ReturnType<
    typeof useLanguageLearningLevelTestController
>;
