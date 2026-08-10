"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chatService } from "@/services/chat/chatService";
import type {
    ChatMessage,
    ChatMessageTranslation,
    ChatRoom,
    ChatRoomMemberRole,
    OpenChatMemberProfile,
    OpenChatProfileSnapshot,
} from "@/types/chat";
import type {
    ChatMemberReadUpdatedEvent,
    ChatPresenceChangedEvent,
} from "@/types/chatWebSocket";

type ChatRoomLoadErrorCode = "LOAD_FAILED";
type ChatRoomSendErrorCode = "SEND_FAILED";
type ChatRoomLoadMoreErrorCode = "LOAD_MORE_FAILED";
type ChatRoomTranslationRetryErrorCode = "RETRY_TRANSLATION_FAILED";

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
    applyMemberReadUpdated: (
        event: ChatMemberReadUpdatedEvent,
    ) => void;
    applyOpenChatProfile: (
        profile: OpenChatMemberProfile | OpenChatProfileSnapshot,
    ) => void;
    applyOpenChatRole: (
        openChatMemberId: number,
        role: ChatRoomMemberRole,
        isCurrentUser: boolean,
    ) => void;
    removeOpenChatMember: (openChatMemberId: number) => void;
    applyPresenceChanged: (event: ChatPresenceChangedEvent) => void;
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

const mergeTranslation = (
    previous: ChatMessageTranslation | undefined,
    incoming: ChatMessageTranslation,
): ChatMessageTranslation => {
    if (!previous) {
        return incoming;
    }

    /*
     * WebSocket 이벤트와 REST 수동 동기화가 섞여도
     * COMPLETED/FAILED 상태가 오래된 PENDING에 의해 되돌아가지 않도록 한다.
     */
    if (previous.status === "PENDING" && incoming.status !== "PENDING") {
        return {
            ...previous,
            ...incoming,
        };
    }

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
    const appliedReadCursorByUserRef = useRef(
        new Map<number, number>(),
    );
    const removedOpenChatMemberIdsRef = useRef(new Set<number>());
    const directPresenceOccurredAtRef = useRef<string | null>(null);
    const directPresencePatchVersionRef = useRef(0);
    const latestDirectPresenceRef = useRef<{
        publicId: string;
        online: boolean;
    } | null>(null);

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
        const presencePatchVersionAtRequest =
            directPresencePatchVersionRef.current;

        try {
            const [roomResponse, messageResponse] = await Promise.all([
                chatService.getRoom(roomId),
                chatService.getMessages(roomId),
            ]);

            removedOpenChatMemberIdsRef.current.clear();

            const latestDirectPresence = latestDirectPresenceRef.current;
            let resolvedRoom = roomResponse;

            if (
                roomResponse.roomType === "DIRECT" &&
                roomResponse.directPartner &&
                latestDirectPresence &&
                directPresencePatchVersionRef.current >
                    presencePatchVersionAtRequest &&
                roomResponse.directPartner.publicId ===
                    latestDirectPresence.publicId
            ) {
                resolvedRoom = {
                    ...roomResponse,
                    directPartner: {
                        ...roomResponse.directPartner,
                        online: latestDirectPresence.online,
                    },
                };
            }

            setRoom(resolvedRoom);
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

    const applyMemberReadUpdated = useCallback(
        (event: ChatMemberReadUpdatedEvent) => {
            if (event.chatRoomId !== roomId) {
                return;
            }

            const lastAppliedCursor =
                appliedReadCursorByUserRef.current.get(
                    event.readerUserId,
                ) ?? 0;

            if (event.lastReadMessageId <= lastAppliedCursor) {
                return;
            }

            const effectivePreviousCursor = Math.max(
                event.previousLastReadMessageId ?? 0,
                lastAppliedCursor,
            );

            appliedReadCursorByUserRef.current.set(
                event.readerUserId,
                event.lastReadMessageId,
            );

            setMessages((currentMessages) =>
                currentMessages.map((message) => {
                    if (
                        message.senderType === "SYSTEM" ||
                        message.messageType === "SYSTEM" ||
                        message.senderUserId ===
                            event.readerUserId ||
                        message.id <= effectivePreviousCursor ||
                        message.id > event.lastReadMessageId ||
                        message.unreadMemberCount === null ||
                        message.unreadMemberCount === undefined ||
                        message.unreadMemberCount <= 0
                    ) {
                        return message;
                    }

                    return {
                        ...message,
                        unreadMemberCount: Math.max(
                            0,
                            message.unreadMemberCount - 1,
                        ),
                    };
                }),
            );
        },
        [roomId],
    );

    const applyOpenChatProfile = useCallback(
        (profile: OpenChatMemberProfile | OpenChatProfileSnapshot) => {
            setMessages((currentMessages) =>
                currentMessages.map((message) => {
                    if (
                        message.sender?.openChatMemberId !==
                        profile.openChatMemberId
                    ) {
                        return message;
                    }

                    return {
                        ...message,
                        sender: {
                            ...message.sender,
                            memberCode: profile.memberCode,
                            nickname: profile.nickname,
                            profileImageUrl: profile.profileImageUrl,
                            role: profile.role,
                        },
                    };
                }),
            );
        },
        [],
    );

    const applyOpenChatRole = useCallback(
        (
            openChatMemberId: number,
            role: ChatRoomMemberRole,
            isCurrentUser: boolean,
        ) => {
            setMessages((currentMessages) =>
                currentMessages.map((message) =>
                    message.sender?.openChatMemberId === openChatMemberId
                        ? {
                              ...message,
                              sender: { ...message.sender, role },
                          }
                        : message,
                ),
            );

            if (isCurrentUser) {
                setRoom((currentRoom) =>
                    currentRoom ? { ...currentRoom, myRole: role } : currentRoom,
                );
            }
        },
        [],
    );

    const removeOpenChatMember = useCallback(
        (openChatMemberId: number) => {
            if (removedOpenChatMemberIdsRef.current.has(openChatMemberId)) {
                return;
            }

            removedOpenChatMemberIdsRef.current.add(openChatMemberId);
            setRoom((currentRoom) =>
                currentRoom?.roomType === "OPEN"
                    ? {
                          ...currentRoom,
                          memberCount: Math.max(
                              0,
                              currentRoom.memberCount - 1,
                          ),
                      }
                    : currentRoom,
            );
        },
        [],
    );

    const applyPresenceChanged = useCallback(
        (event: ChatPresenceChangedEvent) => {
            if (event.roomId !== roomId || event.roomType !== "DIRECT") {
                return;
            }

            directPresencePatchVersionRef.current += 1;
            latestDirectPresenceRef.current = {
                publicId: event.memberRef,
                online: event.online,
            };

            setRoom((currentRoom) => {
                const partner = currentRoom?.directPartner;
                if (!currentRoom || !partner || partner.publicId !== event.memberRef) {
                    return currentRoom;
                }

                const previousOccurredAt = directPresenceOccurredAtRef.current;
                if (
                    previousOccurredAt &&
                    Date.parse(event.occurredAt) < Date.parse(previousOccurredAt)
                ) {
                    return currentRoom;
                }

                directPresenceOccurredAtRef.current = event.occurredAt;
                return {
                    ...currentRoom,
                    directPartner: {
                        ...partner,
                        online: event.online,
                    },
                };
            });
        },
        [roomId],
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

                /*
                 * 수동 재번역 API는 PENDING을 반환할 수 있다.
                 * 이후 완료/실패 반영은 WebSocket translation event가 담당한다.
                 * 단, 버튼 클릭 직후 서버 상태가 이미 COMPLETED일 수 있으므로 1회만 동기화한다.
                 */
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
        appliedReadCursorByUserRef.current.clear();
        removedOpenChatMemberIdsRef.current.clear();
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
        retryTranslationErrorCode,
        retryingTranslationKeys,
        retryTranslationErrorKeys,
        reload: load,
        loadMoreMessages,
        sendMessage,
        appendMessage,
        applyTranslationCompleted,
        applyMemberReadUpdated,
        applyOpenChatProfile,
        applyOpenChatRole,
        removeOpenChatMember,
        applyPresenceChanged,
        syncLatestMessages,
        retryTranslation,
    };
}
