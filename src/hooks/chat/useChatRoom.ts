"use client";

import { useCallback, useEffect, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type {
    ChatMessage,
    ChatMessageTranslation,
    ChatRoom,
} from "@/types/chat";

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
    appendMessage: (message: ChatMessage) => void;
    applyTranslationCompleted: (
        messageId: number,
        translation: ChatMessageTranslation,
    ) => void;
    syncLatestMessages: () => Promise<void>;
}

function sortMessagesByCreatedAt(messages: ChatMessage[]) {
    return [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

const mergeMessagesWithoutDuplicates = (
    messages: ChatMessage[],
): ChatMessage[] => {
    const messageById = new Map<number, ChatMessage>();

    for (const message of sortMessagesByCreatedAt(messages)) {
        const previous = messageById.get(message.id);

        messageById.set(
            message.id,
            previous
                ? {
                    ...previous,
                    ...message,
                    translations: mergeTranslationsWithoutDuplicates([
                        ...previous.translations,
                        ...message.translations,
                    ]),
                }
                : message,
        );
    }

    return Array.from(messageById.values());
};

const mergeTranslationsWithoutDuplicates = (
    translations: ChatMessageTranslation[],
): ChatMessageTranslation[] => {
    const translationByLanguageCode = new Map<string, ChatMessageTranslation>();

    for (const translation of translations) {
        const previous = translationByLanguageCode.get(translation.languageCode);

        translationByLanguageCode.set(translation.languageCode, {
            ...previous,
            ...translation,
        });
    }

    return Array.from(translationByLanguageCode.values());
};

const mergeMessageTranslation = (
    messages: ChatMessage[],
    messageId: number,
    translation: ChatMessageTranslation,
): ChatMessage[] =>
    messages.map((message) => {
        if (message.id !== messageId) {
            return message;
        }

        return {
            ...message,
            translations: mergeTranslationsWithoutDuplicates([
                ...message.translations,
                translation,
            ]),
            updatedAt: translation.completedAt ?? message.updatedAt,
        };
    });

export function useChatRoom(roomId: number): UseChatRoomResult {
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

            setMessages((currentMessages) =>
                mergeMessagesWithoutDuplicates([
                    ...messageResponse.messages,
                    ...currentMessages,
                ]),
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

                setMessages((currentMessages) =>
                    mergeMessagesWithoutDuplicates([...currentMessages, createdMessage]),
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

    const appendMessage = useCallback((message: ChatMessage) => {
        setMessages((currentMessages) =>
            mergeMessagesWithoutDuplicates([message, ...currentMessages]),
        );
    }, []);

    const applyTranslationCompleted = useCallback(
        (messageId: number, translation: ChatMessageTranslation) => {
            setMessages((currentMessages) =>
                mergeMessageTranslation(currentMessages, messageId, translation),
            );
        },
        [],
    );

    const syncLatestMessages = useCallback(async () => {
        try {
            const messageResponse = await chatService.getMessages(roomId);

            setMessages((currentMessages) =>
                mergeMessagesWithoutDuplicates([
                    ...messageResponse.messages,
                    ...currentMessages,
                ]),
            );
        } catch (error) {
            console.error("Failed to sync latest chat messages.", error);
        }
    }, [roomId]);

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
        appendMessage,
        applyTranslationCompleted,
        syncLatestMessages,
    };
}