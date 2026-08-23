"use client";

import { useCallback, useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { voiceSessionService } from "@/services/voice/voiceSessionService";
import type {
    VoiceSegmentResponse,
    VoiceSessionResponse,
} from "@/types/voice";

const HISTORY_PAGE_SIZE = 20;
const SEGMENT_PAGE_SIZE = 100;

export function useVoiceHistory() {
    const [extraItems, setExtraItems] = useState<VoiceSessionResponse[]>([]);
    const [extraNextCursor, setExtraNextCursor] = useState<string | null | undefined>(
        undefined,
    );
    const [segmentsBySession, setSegmentsBySession] = useState<
        Record<string, VoiceSegmentResponse[]>
    >({});
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
    const [actionSessionId, setActionSessionId] = useState<string | null>(null);
    const [actionError, setActionError] = useState(false);

    const historyQuery = useQuery({
        keys: ["voice-session-history"] as const,
        fetcher: () => voiceSessionService.listHistory(null, HISTORY_PAGE_SIZE),
        config: { revalidateOnMount: true },
    });

    const items = useMemo(() => {
        const base = historyQuery.data?.items ?? [];
        const seen = new Set<string>();
        return [...base, ...extraItems].filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }, [extraItems, historyQuery.data?.items]);

    const nextCursor =
        extraNextCursor !== undefined
            ? extraNextCursor
            : historyQuery.data?.nextCursor ?? null;

    const reload = useCallback(async () => {
        setExtraItems([]);
        setExtraNextCursor(undefined);
        await historyQuery.mutate(undefined, true);
    }, [historyQuery]);

    const loadMore = useCallback(async () => {
        if (!nextCursor) return false;

        try {
            const page = await voiceSessionService.listHistory(
                nextCursor,
                HISTORY_PAGE_SIZE,
            );
            setExtraItems((current) => [...current, ...page.items]);
            setExtraNextCursor(page.nextCursor);
            return true;
        } catch (error) {
            console.error("Failed to load more Voice history.", error);
            return false;
        }
    }, [nextCursor]);

    const loadSegments = useCallback(async (sessionId: string) => {
        setLoadingSessionId(sessionId);
        try {
            const collected: VoiceSegmentResponse[] = [];
            let cursor: number | null = null;

            for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
                const page = await voiceSessionService.listSegments(
                    sessionId,
                    cursor,
                    SEGMENT_PAGE_SIZE,
                );
                collected.push(...page.items);
                cursor = page.nextCursor;
                if (cursor === null) break;
            }

            setSegmentsBySession((current) => ({
                ...current,
                [sessionId]: collected,
            }));
            return collected;
        } finally {
            setLoadingSessionId(null);
        }
    }, []);

    const toggleSession = useCallback(
        async (sessionId: string) => {
            if (selectedSessionId === sessionId) {
                setSelectedSessionId(null);
                return;
            }

            setSelectedSessionId(sessionId);
            if (!segmentsBySession[sessionId]) {
                try {
                    await loadSegments(sessionId);
                } catch (error) {
                    console.error("Failed to load Voice segments.", error);
                    setActionError(true);
                }
            }
        },
        [loadSegments, segmentsBySession, selectedSessionId],
    );

    const renameSession = useCallback(
        async (sessionId: string, title: string) => {
            setActionSessionId(sessionId);
            setActionError(false);
            try {
                await voiceSessionService.update(sessionId, {
                    title: title.trim() || null,
                });
                await reload();
                return true;
            } catch (error) {
                console.error("Failed to rename Voice session.", error);
                setActionError(true);
                return false;
            } finally {
                setActionSessionId(null);
            }
        },
        [reload],
    );

    const deleteSession = useCallback(
        async (sessionId: string) => {
            setActionSessionId(sessionId);
            setActionError(false);
            try {
                await voiceSessionService.delete(sessionId);
                setSelectedSessionId((current) =>
                    current === sessionId ? null : current,
                );
                setSegmentsBySession((current) => {
                    const next = { ...current };
                    delete next[sessionId];
                    return next;
                });
                await reload();
                return true;
            } catch (error) {
                console.error("Failed to delete Voice session.", error);
                setActionError(true);
                return false;
            } finally {
                setActionSessionId(null);
            }
        },
        [reload],
    );

    const retryTranslation = useCallback(
        async (sessionId: string, segmentId: number) => {
            setActionSessionId(sessionId);
            setActionError(false);
            try {
                const response = await voiceSessionService.retryTranslation(
                    sessionId,
                    segmentId,
                );
                setSegmentsBySession((current) => ({
                    ...current,
                    [sessionId]: (current[sessionId] ?? []).map((segment) =>
                        segment.id === segmentId ? response.segment : segment,
                    ),
                }));
                return true;
            } catch (error) {
                console.error("Failed to retry Voice translation.", error);
                setActionError(true);
                return false;
            } finally {
                setActionSessionId(null);
            }
        },
        [],
    );

    return {
        items,
        nextCursor,
        selectedSessionId,
        selectedSegments: selectedSessionId
            ? segmentsBySession[selectedSessionId] ?? []
            : [],
        isLoading: historyQuery.isLoading,
        loadError: Boolean(historyQuery.isError),
        loadingSessionId,
        actionSessionId,
        actionError,
        hasMore: Boolean(nextCursor),
        reload,
        loadMore,
        toggleSession,
        renameSession,
        deleteSession,
        retryTranslation,
    };
}

export type VoiceHistoryController = ReturnType<typeof useVoiceHistory>;
