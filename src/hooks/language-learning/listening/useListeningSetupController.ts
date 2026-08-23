"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createIdempotencyKey } from "@/features/language-learning/listening/idempotency";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/navigation";
import { listeningService } from "@/services/language-learning/listeningService";
import { ApiResponseError } from "@/services/common/responseParser";
import type { ListeningTaskType } from "@/types/language-learning/listening";
import { isValidListeningTaskSelection } from "@/types/language-learning/listening";

export function useListeningSetupController() {
    const router = useRouter();
    const entry = useLanguageLearningEntryState();
    const [selectedTasks, setSelectedTasks] = useState<ListeningTaskType[]>(["DICTATION"]);
    const [isStarting, setIsStarting] = useState(false);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const requestKeyRef = useRef<string | null>(null);

    const todayQuery = useQuery({
        keys: ["listening-setup-today"] as const,
        fetcher: () => listeningService.getToday(),
        config: { revalidateOnMount: true },
    });

    const activeSessionQuery = useQuery({
        keys: ["listening-setup-active"] as const,
        fetcher: () => listeningService.getActiveSession(),
        config: { revalidateOnMount: true, shouldRetryOnError: false },
    });

    useEffect(() => {
        const configured = entry.setting?.defaultListeningTaskTypes;
        if (configured && isValidListeningTaskSelection(configured)) {
            setSelectedTasks(configured);
        }
    }, [entry.setting?.defaultListeningTaskTypes]);

    const toggleTask = useCallback((task: ListeningTaskType) => {
        setErrorCode(null);
        setSelectedTasks((current) => current.includes(task)
            ? current.filter((item) => item !== task)
            : [...current, task]);
    }, []);

    const isValid = useMemo(() => isValidListeningTaskSelection(selectedTasks), [selectedTasks]);

    const start = useCallback(async () => {
        if (!todayQuery.data || !isValid || isStarting) return false;
        setIsStarting(true);
        setErrorCode(null);
        const key = requestKeyRef.current ?? createIdempotencyKey("listening-session");
        requestKeyRef.current = key;
        try {
            const session = await listeningService.createSession({
                dailySetId: todayQuery.data.dailySetId,
                selectedTaskTypes: selectedTasks,
                idempotencyKey: key,
            });
            requestKeyRef.current = null;
            router.push(`/language-learning/listening/session/${session.sessionId}`);
            return true;
        } catch (error) {
            const code = error instanceof ApiResponseError ? error.errorCode : "UNKNOWN";
            setErrorCode(code);
            if (code === "LISTENING_ACTIVE_SESSION_EXISTS") {
                const active = await listeningService.getActiveSession().catch(() => null);
                if (active?.active && active.session) {
                    router.push(`/language-learning/listening/session/${active.session.sessionId}`);
                }
            }
            return false;
        } finally {
            setIsStarting(false);
        }
    }, [isStarting, isValid, router, selectedTasks, todayQuery.data]);

    return {
        entry,
        today: todayQuery.data ?? null,
        activeSession: activeSessionQuery.data?.active ? activeSessionQuery.data.session : null,
        isLoading: todayQuery.isLoading || activeSessionQuery.isLoading,
        loadError: todayQuery.isError || activeSessionQuery.isError,
        selectedTasks,
        isValid,
        isStarting,
        errorCode,
        toggleTask,
        start,
        reload: async () => {
            await Promise.all([
                entry.reload(),
                todayQuery.mutate(undefined, true),
                activeSessionQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type ListeningSetupController = ReturnType<typeof useListeningSetupController>;
