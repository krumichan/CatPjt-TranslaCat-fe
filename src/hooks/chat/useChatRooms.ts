"use client";

import { useCallback, useEffect, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type { ChatRoomListItem } from "@/types/chat";

type ChatRoomsLoadErrorCode = "LOAD_FAILED";

interface UseChatRoomsResult {
    rooms: ChatRoomListItem[];
    isLoading: boolean;
    loadErrorCode: ChatRoomsLoadErrorCode | null;
    reload: () => Promise<void>;
}

const filterPhaseOneChatRooms = (
    rooms: ChatRoomListItem[],
): ChatRoomListItem[] =>
    rooms.filter(
        (room) => room.roomType === "DIRECT" || room.roomType === "GROUP",
    );

const sortRoomsByUpdatedAtDesc = (
    rooms: ChatRoomListItem[],
): ChatRoomListItem[] =>
    [...rooms].sort(
        (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

export function useChatRooms(): UseChatRoomsResult {
    const [rooms, setRooms] = useState<ChatRoomListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatRoomsLoadErrorCode | null>(null);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);

        try {
            const response = await chatService.getRooms();
            setRooms(
                sortRoomsByUpdatedAtDesc(
                    filterPhaseOneChatRooms(response.chatRooms),
                ),
            );
        } catch (error) {
            console.error("Failed to load chat rooms", error);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    return {
        rooms,
        isLoading,
        loadErrorCode,
        reload,
    };
}
