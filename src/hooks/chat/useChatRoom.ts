"use client";

import { useCallback, useEffect, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type { ChatMessage, ChatRoom } from "@/types/chat";

type ChatRoomLoadErrorCode = "LOAD_FAILED";
type ChatRoomSendErrorCode = "SEND_FAILED";
type ChatRoomLoadMoreErrorCode = "LOAD_MORE_FAILED";

interface UseChatRoomResult {
    room: ChatRoom | null;
    messages: ChatMessage[];
    isLoading: boolean;
    isSending: boolean;
    isLoadingMore: boolean;
    hasNext: boolean;
    nextCursorId: number | null;
    loadErrorCode: ChatRoomLoadErrorCode | null;
    sendErrorCode: ChatRoomSendErrorCode | null;
    loadMoreErrorCode: ChatRoomLoadMoreErrorCode | null;
    reload: () => Promise<void>;
    loadMoreMessages: () => Promise<boolean>;
    sendMessage: (content: string) => Promise<boolean>;
}

function sortMessagesByCreatedAt(messages: ChatMessage[]) {
    return [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

function mergeMessagesWithoutDuplicates(
    nextMessages: ChatMessage[],
    currentMessages: ChatMessage[],
) {
    const seenIds = new Set<number>();
    const mergedMessages: ChatMessage[] = [];

    for (const message of [...nextMessages, ...currentMessages]) {
        if (seenIds.has(message.id)) {
            continue;
        }

        seenIds.add(message.id);
        mergedMessages.push(message);
    }

    return sortMessagesByCreatedAt(mergedMessages);
}

export function useChatRoom(roomId: string): UseChatRoomResult {
    const [room, setRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasNext, setHasNext] = useState(false);
    const [nextCursorId, setNextCursorId] = useState<number | null>(null);

    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatRoomLoadErrorCode | null>(null);
    const [sendErrorCode, setSendErrorCode] =
        useState<ChatRoomSendErrorCode | null>(null);
    const [loadMoreErrorCode, setLoadMoreErrorCode] =
        useState<ChatRoomLoadMoreErrorCode | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);
        setLoadMoreErrorCode(null);

        try {
            const [roomResponse, messageResponse] = await Promise.all([
                chatService.getRoom(roomId),
                chatService.getMessages(roomId),
            ]);

            setRoom(roomResponse);
            setMessages(sortMessagesByCreatedAt(messageResponse.messages));
            setNextCursorId(messageResponse.nextCursorId);
            setHasNext(messageResponse.hasNext);
        } catch (error) {
            console.error(error);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, [roomId]);

    const loadMoreMessages = useCallback(async () => {
        if (!hasNext || nextCursorId == null || isLoadingMore) {
            return false;
        }

        setIsLoadingMore(true);
        setLoadMoreErrorCode(null);

        try {
            const messageResponse = await chatService.getMessages(
                roomId,
                nextCursorId,
            );

            const previousMessages = sortMessagesByCreatedAt(
                messageResponse.messages,
            );

            setMessages((currentMessages) =>
                mergeMessagesWithoutDuplicates(previousMessages, currentMessages),
            );

            setNextCursorId(messageResponse.nextCursorId);
            setHasNext(messageResponse.hasNext);

            return true;
        } catch (error) {
            console.error(error);
            setLoadMoreErrorCode("LOAD_MORE_FAILED");

            return false;
        } finally {
            setIsLoadingMore(false);
        }
    }, [hasNext, isLoadingMore, nextCursorId, roomId]);

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

                setMessages((prev) =>
                    mergeMessagesWithoutDuplicates([], [...prev, createdMessage]),
                );

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
        isLoadingMore,
        hasNext,
        nextCursorId,
        loadErrorCode,
        sendErrorCode,
        loadMoreErrorCode,
        reload: load,
        loadMoreMessages,
        sendMessage,
    };
}