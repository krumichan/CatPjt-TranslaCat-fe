"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useChatRoomsRealtime } from "@/hooks/chat/useChatRoomsRealtime";
import { chatService } from "@/services/chat/chatService";
import type { ChatMessage, ChatRoomListItem } from "@/types/chat";
import type { ChatReadUpdatedEvent } from "@/types/chatWebSocket";

type ChatRoomsLoadErrorCode = "LOAD_FAILED";

interface UseChatRoomsResult {
    rooms: ChatRoomListItem[];
    isLoading: boolean;
    loadErrorCode: ChatRoomsLoadErrorCode | null;
    reload: () => Promise<void>;
}

const filterSupportedChatRooms = (
    rooms: ChatRoomListItem[],
): ChatRoomListItem[] =>
    rooms.filter(
        (room) =>
            room.roomType === "DIRECT" ||
            room.roomType === "GROUP" ||
            room.roomType === "OPEN",
    );

const sortRoomsByUpdatedAtDesc = (
    rooms: ChatRoomListItem[],
): ChatRoomListItem[] =>
    [...rooms].sort(
        (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

const normalizeRooms = (
    rooms: ChatRoomListItem[],
): ChatRoomListItem[] =>
    sortRoomsByUpdatedAtDesc(
        filterSupportedChatRooms(rooms).map((room) => ({
            ...room,
            unreadCount: Math.max(0, room.unreadCount ?? 0),
        })),
    );

const normalizeEmail = (email: string | null | undefined) =>
    email?.trim().toLowerCase() ?? null;

export function useChatRooms(): UseChatRoomsResult {
    const { data: session } = useSession();
    const [rooms, setRooms] = useState<ChatRoomListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatRoomsLoadErrorCode | null>(null);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);

        try {
            const response = await chatService.getRooms();
            setRooms(normalizeRooms(response.chatRooms));
        } catch (error) {
            console.error("Failed to load chat rooms", error);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const currentUserEmail = normalizeEmail(session?.user?.email);

    const handleMessageCreated = useCallback(
        (message: ChatMessage) => {
            const isSystemMessage =
                message.senderType === "SYSTEM" ||
                message.messageType === "SYSTEM";
            const isCurrentUserMessage =
                message.senderType === "USER" &&
                currentUserEmail !== null &&
                normalizeEmail(message.senderEmail) === currentUserEmail;

            if (isSystemMessage || isCurrentUserMessage) {
                return;
            }

            setRooms((currentRooms) => {
                let updated = false;

                const nextRooms = currentRooms.map((room) => {
                    if (room.id !== message.chatRoomId) {
                        return room;
                    }

                    updated = true;
                    return {
                        ...room,
                        unreadCount: room.unreadCount + 1,
                        updatedAt: message.createdAt,
                    };
                });

                return updated
                    ? sortRoomsByUpdatedAtDesc(nextRooms)
                    : currentRooms;
            });
        },
        [currentUserEmail],
    );

    const handleReadUpdated = useCallback(
        (event: ChatReadUpdatedEvent) => {
            setRooms((currentRooms) =>
                currentRooms.map((room) =>
                    room.id === event.chatRoomId
                        ? {
                              ...room,
                              unreadCount: Math.max(0, event.unreadCount),
                          }
                        : room,
                ),
            );
        },
        [],
    );

    const roomIds = useMemo(
        () => rooms.map((room) => room.id),
        [rooms],
    );

    useChatRoomsRealtime({
        roomIds,
        accessToken: session?.accessToken ?? null,
        onMessageCreated: handleMessageCreated,
        onReadUpdated: handleReadUpdated,
        onReconnectSyncRequested: reload,
    });

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
