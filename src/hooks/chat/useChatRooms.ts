"use client";

import { useCallback, useEffect, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type { ChatRoom } from "@/types/chat";

type ChatRoomsLoadErrorCode = "LOAD_FAILED";

interface UseChatRoomsResult {
    rooms: ChatRoom[];
    isLoading: boolean;
    isCreateModalOpen: boolean;
    setIsCreateModalOpen: (open: boolean) => void;
    loadErrorCode: ChatRoomsLoadErrorCode | null;
    reload: () => Promise<void>;
}

const filterPhaseOneChatRooms = (rooms: ChatRoom[]): ChatRoom[] =>
    rooms.filter(
        (room) =>
            room.active &&
            (room.roomType === "DIRECT" || room.roomType === "GROUP"),
    );

const sortRoomsByUpdatedAtDesc = (rooms: ChatRoom[]): ChatRoom[] =>
    [...rooms].sort(
        (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

export function useChatRooms(): UseChatRoomsResult {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatRoomsLoadErrorCode | null>(null);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        isCreateModalOpen,
        setIsCreateModalOpen,
        loadErrorCode,
        reload,
    };
}