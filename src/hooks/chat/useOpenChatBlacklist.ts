"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { openChatService } from "@/services/chat/openChatService";
import { getApiErrorCode } from "@/services/common/responseParser";
import type { OpenChatBanListItem } from "@/types/chat";

export type OpenChatBlacklistErrorCode =
    | "ACCESS_DENIED"
    | "ROOM_CLOSED"
    | "LOAD_FAILED";
export type OpenChatBanReleaseErrorCode =
    | "ACCESS_CHANGED"
    | "BAN_NOT_FOUND"
    | "ROOM_CLOSED"
    | "RELEASE_FAILED";

interface UseOpenChatBlacklistOptions {
    enabled?: boolean;
}

export function useOpenChatBlacklist(
    roomId: number,
    { enabled = true }: UseOpenChatBlacklistOptions = {},
) {
    const requestSequenceRef = useRef(0);
    const [items, setItems] = useState<OpenChatBanListItem[]>([]);
    const [keywordInput, setKeywordInput] = useState("");
    const [appliedKeyword, setAppliedKeyword] = useState<string | null>(null);
    const [nextCursorId, setNextCursorId] = useState<number | null>(null);
    const [hasNext, setHasNext] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<OpenChatBlacklistErrorCode | null>(null);
    const [selectedBan, setSelectedBan] =
        useState<OpenChatBanListItem | null>(null);
    const [isReleasing, setIsReleasing] = useState(false);
    const [releaseErrorCode, setReleaseErrorCode] =
        useState<OpenChatBanReleaseErrorCode | null>(null);

    const load = useCallback(
        async (keyword: string | null) => {
            if (!enabled) {
                return false;
            }

            const sequence = ++requestSequenceRef.current;
            setIsLoading(true);
            setLoadErrorCode(null);

            try {
                const response = await openChatService.getActiveBans(roomId, {
                    keyword,
                    size: 20,
                });
                if (sequence !== requestSequenceRef.current) {
                    return false;
                }
                setItems(response.items);
                setNextCursorId(response.nextCursorId);
                setHasNext(response.hasNext);
                setAppliedKeyword(keyword);
                return true;
            } catch (error) {
                if (sequence !== requestSequenceRef.current) {
                    return false;
                }
                const code = getApiErrorCode(error);
                if (
                    code === "OPEN_CHAT_MODERATION_ACCESS_DENIED" ||
                    code === "OPEN_CHAT_OWNER_ONLY"
                ) {
                    setLoadErrorCode("ACCESS_DENIED");
                } else if (code === "OPEN_CHAT_ROOM_CLOSED") {
                    setLoadErrorCode("ROOM_CLOSED");
                } else {
                    setLoadErrorCode("LOAD_FAILED");
                }
                return false;
            } finally {
                if (sequence === requestSequenceRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [enabled, roomId],
    );

    useEffect(() => {
        if (!enabled) {
            requestSequenceRef.current += 1;
            setSelectedBan(null);
            setReleaseErrorCode(null);
            return;
        }

        setKeywordInput("");
        void load(null);
    }, [enabled, load]);

    const reload = useCallback(
        () => load(appliedKeyword),
        [appliedKeyword, load],
    );

    const search = useCallback(async () => {
        const normalized = keywordInput.trim();
        return load(normalized || null);
    }, [keywordInput, load]);

    const clearSearch = useCallback(async () => {
        setKeywordInput("");
        return load(null);
    }, [load]);

    const loadMore = useCallback(async () => {
        if (
            !enabled ||
            !hasNext ||
            nextCursorId == null ||
            isLoadingMore
        ) {
            return false;
        }

        setIsLoadingMore(true);
        try {
            const response = await openChatService.getActiveBans(roomId, {
                keyword: appliedKeyword,
                cursorId: nextCursorId,
                size: 20,
            });
            setItems((current) => {
                const known = new Set(current.map((item) => item.banId));
                return [
                    ...current,
                    ...response.items.filter(
                        (item) => !known.has(item.banId),
                    ),
                ];
            });
            setNextCursorId(response.nextCursorId);
            setHasNext(response.hasNext);
            return true;
        } catch (error) {
            console.error("Failed to load more OPEN chat bans.", error);
            return false;
        } finally {
            setIsLoadingMore(false);
        }
    }, [
        appliedKeyword,
        enabled,
        hasNext,
        isLoadingMore,
        nextCursorId,
        roomId,
    ]);

    const openReleaseDialog = useCallback((item: OpenChatBanListItem) => {
        if (!item.releasable) {
            return;
        }
        setSelectedBan(item);
        setReleaseErrorCode(null);
    }, []);

    const closeReleaseDialog = useCallback(() => {
        if (isReleasing) {
            return;
        }
        setSelectedBan(null);
        setReleaseErrorCode(null);
    }, [isReleasing]);

    const release = useCallback(async () => {
        if (!selectedBan || isReleasing) {
            return false;
        }
        setIsReleasing(true);
        setReleaseErrorCode(null);
        try {
            await openChatService.releaseBan(roomId, selectedBan.banId);
            setItems((current) =>
                current.filter((item) => item.banId !== selectedBan.banId),
            );
            setSelectedBan(null);
            return true;
        } catch (error) {
            const code = getApiErrorCode(error);
            if (code === "OPEN_CHAT_BAN_NOT_FOUND") {
                setReleaseErrorCode("BAN_NOT_FOUND");
                await load(appliedKeyword);
            } else if (
                code === "OPEN_CHAT_BAN_RELEASE_FORBIDDEN" ||
                code === "OPEN_CHAT_MODERATION_ACCESS_DENIED"
            ) {
                setReleaseErrorCode("ACCESS_CHANGED");
                await load(appliedKeyword);
            } else if (code === "OPEN_CHAT_ROOM_CLOSED") {
                setReleaseErrorCode("ROOM_CLOSED");
                await load(appliedKeyword);
            } else {
                setReleaseErrorCode("RELEASE_FAILED");
            }
            return false;
        } finally {
            setIsReleasing(false);
        }
    }, [appliedKeyword, isReleasing, load, roomId, selectedBan]);

    return {
        items,
        keywordInput,
        appliedKeyword,
        hasNext,
        isLoading,
        isLoadingMore,
        loadErrorCode,
        selectedBan,
        isReleasing,
        releaseErrorCode,
        setKeywordInput,
        search,
        clearSearch,
        loadMore,
        reload,
        openReleaseDialog,
        closeReleaseDialog,
        release,
    };
}
