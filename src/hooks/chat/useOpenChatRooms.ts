"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRouter } from "@/navigation";
import { openChatService } from "@/services/chat/openChatService";
import type { OpenChatRoomListItem } from "@/types/chat";

const OPEN_CHAT_PAGE_SIZE = 12;
const OPEN_CHAT_SEARCH_DEBOUNCE_MS = 350;

export type OpenChatRoomsLoadErrorCode =
    | "LOAD_FAILED"
    | "LOAD_MORE_FAILED";

interface UseOpenChatRoomsResult {
    keyword: string;
    rooms: OpenChatRoomListItem[];
    isLoading: boolean;
    isLoadingMore: boolean;
    isDebouncing: boolean;
    hasNext: boolean;
    loadErrorCode: OpenChatRoomsLoadErrorCode | null;
    loadMoreErrorCode: OpenChatRoomsLoadErrorCode | null;
    updateKeyword: (value: string) => void;
    clearKeyword: () => void;
    reload: () => Promise<void>;
    loadMore: () => Promise<boolean>;
}

function normalizeRooms(
    rooms: OpenChatRoomListItem[],
): OpenChatRoomListItem[] {
    const uniqueRooms = new Map<number, OpenChatRoomListItem>();

    for (const room of rooms) {
        if (room.visibility !== "PUBLIC" || room.status !== "ACTIVE") {
            continue;
        }
        uniqueRooms.set(room.id, room);
    }

    return Array.from(uniqueRooms.values());
}

function mergeRooms(
    currentRooms: OpenChatRoomListItem[],
    incomingRooms: OpenChatRoomListItem[],
): OpenChatRoomListItem[] {
    const roomById = new Map<number, OpenChatRoomListItem>();

    for (const room of [...currentRooms, ...incomingRooms]) {
        if (room.visibility !== "PUBLIC" || room.status !== "ACTIVE") {
            continue;
        }
        roomById.set(room.id, room);
    }

    return Array.from(roomById.values());
}

export function useOpenChatRooms(
    initialKeyword = "",
): UseOpenChatRoomsResult {
    const router = useRouter();
    const [keyword, setKeyword] = useState(initialKeyword);
    const debouncedKeyword = useDebouncedValue(
        keyword,
        OPEN_CHAT_SEARCH_DEBOUNCE_MS,
    );
    const [rooms, setRooms] = useState<OpenChatRoomListItem[]>([]);
    const [nextCursorId, setNextCursorId] = useState<number | null>(null);
    const [hasNext, setHasNext] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<OpenChatRoomsLoadErrorCode | null>(null);
    const [loadMoreErrorCode, setLoadMoreErrorCode] =
        useState<OpenChatRoomsLoadErrorCode | null>(null);
    const requestSequenceRef = useRef(0);

    const normalizedDebouncedKeyword = useMemo(
        () => debouncedKeyword.trim(),
        [debouncedKeyword],
    );
    const isDebouncing = keyword !== debouncedKeyword;

    const syncQuery = useCallback(
        (nextKeyword: string) => {
            const normalized = nextKeyword.trim();
            router.replace(
                normalized
                    ? `/chat/open?q=${encodeURIComponent(normalized)}`
                    : "/chat/open",
                { scroll: false },
            );
        },
        [router],
    );

    const loadInitial = useCallback(async () => {
        const requestSequence = ++requestSequenceRef.current;
        setIsLoading(true);
        setLoadErrorCode(null);
        setLoadMoreErrorCode(null);

        try {
            const response = await openChatService.getPublicRooms({
                keyword: normalizedDebouncedKeyword || null,
                size: OPEN_CHAT_PAGE_SIZE,
            });

            if (requestSequence !== requestSequenceRef.current) {
                return;
            }

            setRooms(normalizeRooms(response.openChatRooms));
            setNextCursorId(response.nextCursorId);
            setHasNext(response.hasNext);
            syncQuery(normalizedDebouncedKeyword);
        } catch (error) {
            if (requestSequence !== requestSequenceRef.current) {
                return;
            }

            console.error("Failed to load PUBLIC OPEN chat rooms.", error);
            setRooms([]);
            setNextCursorId(null);
            setHasNext(false);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            if (requestSequence === requestSequenceRef.current) {
                setIsLoading(false);
            }
        }
    }, [normalizedDebouncedKeyword, syncQuery]);

    useEffect(() => {
        void loadInitial();
    }, [loadInitial]);

    const loadMore = useCallback(async () => {
        if (
            isLoading ||
            isLoadingMore ||
            !hasNext ||
            nextCursorId == null
        ) {
            return false;
        }

        const requestSequence = requestSequenceRef.current;
        setIsLoadingMore(true);
        setLoadMoreErrorCode(null);

        try {
            const response = await openChatService.getPublicRooms({
                keyword: normalizedDebouncedKeyword || null,
                cursorId: nextCursorId,
                size: OPEN_CHAT_PAGE_SIZE,
            });

            if (requestSequence !== requestSequenceRef.current) {
                return false;
            }

            setRooms((currentRooms) =>
                mergeRooms(currentRooms, response.openChatRooms),
            );
            setNextCursorId(response.nextCursorId);
            setHasNext(response.hasNext);
            return true;
        } catch (error) {
            console.error("Failed to load more PUBLIC OPEN rooms.", error);
            setLoadMoreErrorCode("LOAD_MORE_FAILED");
            return false;
        } finally {
            setIsLoadingMore(false);
        }
    }, [
        hasNext,
        isLoading,
        isLoadingMore,
        nextCursorId,
        normalizedDebouncedKeyword,
    ]);

    const updateKeyword = useCallback((value: string) => {
        setKeyword(value.slice(0, 100));
        setLoadErrorCode(null);
        setLoadMoreErrorCode(null);
    }, []);

    const clearKeyword = useCallback(() => {
        setKeyword("");
    }, []);

    return {
        keyword,
        rooms,
        isLoading,
        isLoadingMore,
        isDebouncing,
        hasNext,
        loadErrorCode,
        loadMoreErrorCode,
        updateKeyword,
        clearKeyword,
        reload: loadInitial,
        loadMore,
    };
}
