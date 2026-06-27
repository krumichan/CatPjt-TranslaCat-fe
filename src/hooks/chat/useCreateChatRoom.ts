"use client";

import { useCallback, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type { ChatRoom, ChatRoomCreateRequest } from "@/types/chat";

type ChatRoomCreateErrorCode = "CREATE_FAILED";

interface UseCreateChatRoomResult {
    isCreating: boolean;
    createErrorCode: ChatRoomCreateErrorCode | null;
    createRoom: (request: ChatRoomCreateRequest) => Promise<ChatRoom | null>;
    clearCreateError: () => void;
}

export function useCreateChatRoom(): UseCreateChatRoomResult {
    const [isCreating, setIsCreating] = useState(false);
    const [createErrorCode, setCreateErrorCode] =
        useState<ChatRoomCreateErrorCode | null>(null);

    const clearCreateError = useCallback(() => {
        setCreateErrorCode(null);
    }, []);

    const createRoom = useCallback(async (request: ChatRoomCreateRequest) => {
        setIsCreating(true);
        setCreateErrorCode(null);

        try {
            return await chatService.createRoom(request);
        } catch (error) {
            console.error("Failed to create chat room", error);
            setCreateErrorCode("CREATE_FAILED");
            return null;
        } finally {
            setIsCreating(false);
        }
    }, []);

    return {
        isCreating,
        createErrorCode,
        createRoom,
        clearCreateError,
    };
}