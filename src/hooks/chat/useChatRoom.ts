"use client";

import { useCallback, useEffect, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type { ChatMessage, ChatRoom } from "@/types/chat";

type ChatRoomLoadErrorCode = "LOAD_FAILED";
type ChatRoomSendErrorCode = "SEND_FAILED";

interface UseChatRoomResult {
    room: ChatRoom | null;
    messages: ChatMessage[];
    isLoading: boolean;
    isSending: boolean;
    loadErrorCode: ChatRoomLoadErrorCode | null;
    sendErrorCode: ChatRoomSendErrorCode | null;
    reload: () => Promise<void>;
    sendMessage: (content: string) => Promise<boolean>;
}

export function useChatRoom(roomId: string): UseChatRoomResult {
    const [room, setRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatRoomLoadErrorCode | null>(null);
    const [sendErrorCode, setSendErrorCode] =
        useState<ChatRoomSendErrorCode | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);

        try {
            const [roomResponse, messageResponse] = await Promise.all([
                chatService.getRoom(roomId),
                chatService.getMessages(roomId),
            ]);

            setRoom(roomResponse);

            const sortedMessages = [...messageResponse.messages].sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );

            setMessages(sortedMessages);
        } catch (error) {
            console.error(error);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, [roomId]);

    const sendMessage = useCallback(
        async (content: string) => {
            const trimmedContent = content.trim();

            if (!trimmedContent || isSending) {
                return false;
            }

            setIsSending(true);
            setSendErrorCode(null);

            try {
                const createdMessage = await chatService.createMessage(roomId, {
                    content: trimmedContent,
                });

                setMessages((prev) => [...prev, createdMessage]);

                return true;
            } catch (error) {
                console.error(error);
                setSendErrorCode("SEND_FAILED");

                return false;
            } finally {
                setIsSending(false);
            }
        },
        [isSending, roomId],
    );

    useEffect(() => {
        void load();
    }, [load]);

    return {
        room,
        messages,
        isLoading,
        isSending,
        loadErrorCode,
        sendErrorCode,
        reload: load,
        sendMessage,
    };
}