"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type {
    ChatMessage,
    ChatMessageTranslation,
    ChatRoom,
} from "@/types/chat";

type ChatRoomLoadErrorCode = "LOAD_FAILED";
type ChatRoomSendErrorCode = "SEND_FAILED";
type ChatRoomLoadMoreErrorCode = "LOAD_MORE_FAILED";
type ChatRoomTranslationRetryErrorCode = "RETRY_TRANSLATION_FAILED";

const PENDING_TRANSLATION_SYNC_INTERVAL_MS = 2000;

export const getChatTranslationKey = (
    messageId: number,
    languageCode: string,
) => `${messageId}:${languageCode.trim().toLowerCase()}`;

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
    retryTranslationErrorCode: ChatRoomTranslationRetryErrorCode | null;
    retryingTranslationKeys: string[];
    retryTranslationErrorKeys: string[];
    reload: () => Promise<void>;
    loadMoreMessages: () => Promise<boolean>;
    sendMessage: (content: string) => Promise<boolean>;
    appendMessage: (message: ChatMessage) => void;
    applyTranslationCompleted: (
        messageId: number,
        translation: ChatMessageTranslation,
    ) => void;
    syncLatestMessages: () => Promise<void>;
    retryTranslation: (
        messageId: number,
        languageCode: string,
    ) => Promise<boolean>;
}

function sortMessagesByCreatedAt(messages: ChatMessage[]) {
    return [...messages].sort(
        (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

const hasPendingTranslation = (messages: ChatMessage[]) =>
    messages.some((message) =>
        message.translations.some(
            (translation) => translation.status === "PENDING",
        ),
    );

const mergeTranslation = (
    previous: ChatMessageTranslation | undefined,
    incoming: ChatMessageTranslation,
): ChatMessageTranslation => {
    if (!previous) {
        return incoming;
    }

    /*
     * 가장 중요한 방어 로직.
     *
     * 현재 화면에는 PENDING이 남아 있고,
     * REST 재조회 결과에는 COMPLETED/FAILED가 내려올 수 있다.
     * 이때 기존 PENDING이 최신 COMPLETED를 다시 덮어쓰면 화면이 계속 "번역 중..."에 머문다.
     */
    if (previous.status === "PENDING" && incoming.status !== "PENDING") {
        return {
            ...previous,
            ...incoming,
        };
    }

    /*
     * 이미 COMPLETED/FAILED인 번역을 오래된 PENDING 응답이 덮어쓰지 못하게 한다.
     */
    if (previous.status !== "PENDING" && incoming.status === "PENDING") {
        return previous;
    }

    return {
        ...previous,
        ...incoming,
    };
};

const mergeTranslationsWithoutDuplicates = (
    translations: ChatMessageTranslation[],
): ChatMessageTranslation[] => {
    const translationByLanguageCode = new Map<
        string,
        ChatMessageTranslation
    >();

    for (const translation of translations) {
        const key = translation.languageCode.trim().toLowerCase();
        const previous = translationByLanguageCode.get(key);

        translationByLanguageCode.set(
            key,
            mergeTranslation(previous, translation),
        );
    }

    return Array.from(translationByLanguageCode.values());
};

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
    const [retryTranslationErrorCode, setRetryTranslationErrorCode] =
        useState<ChatRoomTranslationRetryErrorCode | null>(null);
    const [retryingTranslationKeySet, setRetryingTranslationKeySet] = useState(
        () => new Set<string>(),
    );
    const [retryTranslationErrorKeySet, setRetryTranslationErrorKeySet] =
        useState(() => new Set<string>());

    const retryingTranslationKeys = useMemo(
        () => Array.from(retryingTranslationKeySet),
        [retryingTranslationKeySet],
    );

    const retryTranslationErrorKeys = useMemo(
        () => Array.from(retryTranslationErrorKeySet),
        [retryTranslationErrorKeySet],
    );

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
                    mergeMessagesWithoutDuplicates([
                        ...currentMessages,
                        createdMessage,
                    ]),
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
            mergeMessagesWithoutDuplicates([...currentMessages, message]),
        );
    }, []);

    const applyTranslationCompleted = useCallback(
        (messageId: number, translation: ChatMessageTranslation) => {
            setMessages((currentMessages) =>
                mergeMessageTranslation(currentMessages, messageId, translation),
            );

            const key = getChatTranslationKey(
                messageId,
                translation.languageCode,
            );

            setRetryingTranslationKeySet((current) => {
                const next = new Set(current);
                next.delete(key);
                return next;
            });

            setRetryTranslationErrorKeySet((current) => {
                const next = new Set(current);
                next.delete(key);
                return next;
            });
        },
        [],
    );

    const syncLatestMessages = useCallback(async () => {
        try {
            const messageResponse = await chatService.getMessages(roomId);

            setMessages((currentMessages) =>
                mergeMessagesWithoutDuplicates([
                    ...currentMessages,
                    ...messageResponse.messages,
                ]),
            );
            setNextCursorId(messageResponse.nextCursorId);
            setHasNext(messageResponse.hasNext);
        } catch (error) {
            console.error("Failed to sync latest chat messages.", error);
        }
    }, [roomId]);

    const retryTranslation = useCallback(
        async (messageId: number, languageCode: string) => {
            const key = getChatTranslationKey(messageId, languageCode);

            if (retryingTranslationKeySet.has(key)) {
                return false;
            }

            setRetryTranslationErrorCode(null);
            setRetryTranslationErrorKeySet((current) => {
                const next = new Set(current);
                next.delete(key);
                return next;
            });
            setRetryingTranslationKeySet((current) => {
                const next = new Set(current);
                next.add(key);
                return next;
            });

            try {
                const translation = await chatService.retryMessageTranslation(
                    roomId,
                    messageId,
                    languageCode,
                );

                setMessages((currentMessages) =>
                    mergeMessageTranslation(
                        currentMessages,
                        messageId,
                        translation,
                    ),
                );

                await syncLatestMessages();

                return true;
            } catch (error) {
                console.error("Failed to retry chat message translation.", error);
                setRetryTranslationErrorCode("RETRY_TRANSLATION_FAILED");
                setRetryTranslationErrorKeySet((current) => {
                    const next = new Set(current);
                    next.add(key);
                    return next;
                });
                return false;
            } finally {
                setRetryingTranslationKeySet((current) => {
                    const next = new Set(current);
                    next.delete(key);
                    return next;
                });
            }
        },
        [retryingTranslationKeySet, roomId, syncLatestMessages],
    );

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (isLoading || messages.length === 0) {
            return;
        }

        if (!hasPendingTranslation(messages)) {
            return;
        }

        /*
         * PENDING이 생긴 직후 2초를 기다리지 않고 즉시 한 번 재조회한다.
         * 그 뒤에도 남아 있으면 2초마다 fallback polling한다.
         */
        void syncLatestMessages();

        const intervalId = window.setInterval(() => {
            void syncLatestMessages();
        }, PENDING_TRANSLATION_SYNC_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isLoading, messages, syncLatestMessages]);

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
        retryTranslationErrorCode,
        retryingTranslationKeys,
        retryTranslationErrorKeys,
        reload: load,
        loadMoreMessages,
        sendMessage,
        appendMessage,
        applyTranslationCompleted,
        syncLatestMessages,
        retryTranslation,
    };
}
