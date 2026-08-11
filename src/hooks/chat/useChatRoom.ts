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
type ChatRoomLoadNewerErrorCode = "LOAD_NEWER_FAILED";
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
    isLoadingNewer: boolean;
    hasNext: boolean;
    nextCursorId: number | null;
    hasNewer: boolean;
    newerCursorId: number | null;
    activeAnchorMessageId: number | null;
    loadErrorCode: ChatRoomLoadErrorCode | null;
    sendErrorCode: ChatRoomSendErrorCode | null;
    loadMoreErrorCode: ChatRoomLoadMoreErrorCode | null;
    loadNewerErrorCode: ChatRoomLoadNewerErrorCode | null;
    retryTranslationErrorCode: ChatRoomTranslationRetryErrorCode | null;
    retryingTranslationKeys: string[];
    retryTranslationErrorKeys: string[];
    reload: () => Promise<void>;
    loadMoreMessages: () => Promise<boolean>;
    loadNewerMessages: () => Promise<boolean>;
    jumpToLatestMessages: () => Promise<number | null>;
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

function sortMessagesById(messages: ChatMessage[]) {
    /*
     * Message ID is the authoritative room sequence/high-water mark.
     * Do not use createdAt for ordering: timestamps can cross runtime
     * time-zone boundaries while IDs remain monotonic within the room.
     */
    return [...messages].sort((a, b) => a.id - b.id);
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

    for (const message of sortMessagesById(messages)) {
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

export function useChatRoom(
    roomId: number,
    initialFirstUnreadMessageId: number | null = null,
): UseChatRoomResult {
    const normalizedFirstUnreadMessageId = useMemo(
        () =>
            Number.isSafeInteger(initialFirstUnreadMessageId) &&
            (initialFirstUnreadMessageId ?? 0) > 0
                ? initialFirstUnreadMessageId
                : null,
        [initialFirstUnreadMessageId],
    );
    const [room, setRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoadingNewer, setIsLoadingNewer] = useState(false);
    const [hasNext, setHasNext] = useState(false);
    const [nextCursorId, setNextCursorId] = useState<number | null>(null);
    const [hasNewer, setHasNewer] = useState(false);
    const [newerCursorId, setNewerCursorId] = useState<number | null>(null);
    const [activeAnchorMessageId, setActiveAnchorMessageId] = useState<
        number | null
    >(null);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatRoomLoadErrorCode | null>(null);
    const [sendErrorCode, setSendErrorCode] =
        useState<ChatRoomSendErrorCode | null>(null);
    const [loadMoreErrorCode, setLoadMoreErrorCode] =
        useState<ChatRoomLoadMoreErrorCode | null>(null);
    const [loadNewerErrorCode, setLoadNewerErrorCode] =
        useState<ChatRoomLoadNewerErrorCode | null>(null);
    const [retryTranslationErrorCode, setRetryTranslationErrorCode] =
        useState<ChatRoomTranslationRetryErrorCode | null>(null);
    const [retryingTranslationKeySet, setRetryingTranslationKeySet] = useState(
        () => new Set<string>(),
    );
    const [retryTranslationErrorKeySet, setRetryTranslationErrorKeySet] =
        useState(() => new Set<string>());
    const appliedReadCursorByUserRef = useRef(
        new Map<string, number>(),
    );
    const removedOpenChatMemberIdsRef = useRef(new Set<number>());
    const directPresenceOccurredAtRef = useRef<string | null>(null);
    const directPresencePatchVersionRef = useRef(0);
    const hasLoadedSuccessfullyRef = useRef(false);
    const hasNewerRef = useRef(false);
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

    const applyNewerState = useCallback(
        (nextHasNewer: boolean, nextCursor: number | null) => {
            hasNewerRef.current = nextHasNewer;
            setHasNewer(nextHasNewer);
            setNewerCursorId(nextHasNewer ? nextCursor : null);
        },
        [],
    );

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadErrorCode(null);
        setLoadMoreErrorCode(null);
        setLoadNewerErrorCode(null);
        const presencePatchVersionAtRequest =
            directPresencePatchVersionRef.current;
        const shouldUseInitialAnchor =
            !hasLoadedSuccessfullyRef.current &&
            normalizedFirstUnreadMessageId !== null;
        const shouldPreserveAnchoredMessages =
            hasLoadedSuccessfullyRef.current && hasNewerRef.current;

        try {
            const messageRequest = shouldPreserveAnchoredMessages
                ? Promise.resolve({ mode: "preserve" as const })
                : shouldUseInitialAnchor
                ? chatService
                      .getMessagesAroundAnchor(
                          roomId,
                          normalizedFirstUnreadMessageId,
                      )
                      .then((response) => ({
                          mode: "anchor" as const,
                          response,
                      }))
                      .catch(async (error) => {
                          console.warn(
                              "Failed to load first-unread anchor. Falling back to latest messages.",
                              error,
                          );
                          return {
                              mode: "latest" as const,
                              response: await chatService.getMessages(roomId),
                          };
                      })
                : chatService.getMessages(roomId).then((response) => ({
                      mode: "latest" as const,
                      response,
                  }));

            const [roomResponse, messageResult] = await Promise.all([
                chatService.getRoom(roomId),
                messageRequest,
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
            if (messageResult.mode === "preserve") {
                hasLoadedSuccessfullyRef.current = true;
                return;
            }

            setMessages(
                sortMessagesById(messageResult.response.messages),
            );

            if (messageResult.mode === "anchor") {
                setActiveAnchorMessageId(
                    messageResult.response.anchorMessageId,
                );
                setNextCursorId(messageResult.response.previousCursorId);
                setHasNext(messageResult.response.hasPrevious);
                applyNewerState(
                    messageResult.response.hasNext,
                    messageResult.response.nextCursorId,
                );
            } else {
                setActiveAnchorMessageId(null);
                setNextCursorId(messageResult.response.nextCursorId);
                setHasNext(messageResult.response.hasNext);
                applyNewerState(false, null);
            }

            hasLoadedSuccessfullyRef.current = true;
        } catch (error) {
            console.error(error);
            setLoadErrorCode("LOAD_FAILED");
        } finally {
            setIsLoading(false);
        }
    }, [applyNewerState, normalizedFirstUnreadMessageId, roomId]);

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

    const loadNewerMessages = useCallback(async () => {
        if (!hasNewer || newerCursorId == null || isLoadingNewer) {
            return false;
        }

        setIsLoadingNewer(true);
        setLoadNewerErrorCode(null);

        try {
            const messageResponse = await chatService.getMessagesAfter(
                roomId,
                newerCursorId,
                30,
            );

            setMessages((currentMessages) =>
                mergeMessagesWithoutDuplicates([
                    ...currentMessages,
                    ...messageResponse.messages,
                ]),
            );
            applyNewerState(
                messageResponse.hasNext,
                messageResponse.nextCursorId,
            );

            return true;
        } catch (error) {
            console.error(error);
            setLoadNewerErrorCode("LOAD_NEWER_FAILED");
            return false;
        } finally {
            setIsLoadingNewer(false);
        }
    }, [
        applyNewerState,
        hasNewer,
        isLoadingNewer,
        newerCursorId,
        roomId,
    ]);

    const replaceWithLatestPage = useCallback(async () => {
        const messageResponse = await chatService.getMessages(roomId);

        setMessages(sortMessagesById(messageResponse.messages));
        setNextCursorId(messageResponse.nextCursorId);
        setHasNext(messageResponse.hasNext);
        setActiveAnchorMessageId(null);
        applyNewerState(false, null);

        return messageResponse.messages.reduce(
            (latestId, message) => Math.max(latestId, message.id),
            0,
        );
    }, [applyNewerState, roomId]);

    const jumpToLatestMessages = useCallback(async () => {
        if (isLoadingNewer) {
            return null;
        }

        setIsLoadingNewer(true);
        setLoadNewerErrorCode(null);

        try {
            const latestMessageId = await replaceWithLatestPage();
            return latestMessageId > 0 ? latestMessageId : null;
        } catch (error) {
            console.error("Failed to jump to latest chat messages.", error);
            setLoadNewerErrorCode("LOAD_NEWER_FAILED");
            return null;
        } finally {
            setIsLoadingNewer(false);
        }
    }, [isLoadingNewer, replaceWithLatestPage]);

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

                if (hasNewerRef.current) {
                    setMessages([createdMessage]);
                    setNextCursorId(createdMessage.id);
                    setHasNext(true);
                    setActiveAnchorMessageId(null);
                    applyNewerState(false, null);
                } else {
                    setMessages((currentMessages) =>
                        mergeMessagesWithoutDuplicates([
                            ...currentMessages,
                            createdMessage,
                        ]),
                    );
                }

                return true;
            } catch (error) {
                console.error(error);
                setSendErrorCode("SEND_FAILED");
                return false;
            } finally {
                setIsSending(false);
            }
        },
        [applyNewerState, isSending, roomId],
    );

    const appendMessage = useCallback((message: ChatMessage) => {
        if (hasNewerRef.current) {
            return;
        }

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

            const readerCursorKey =
                typeof event.readerOpenChatMemberId === "number"
                    ? `open:${event.readerOpenChatMemberId}`
                    : typeof event.readerUserId === "number"
                      ? `user:${event.readerUserId}`
                      : null;

            if (readerCursorKey === null) {
                return;
            }

            const lastAppliedCursor =
                appliedReadCursorByUserRef.current.get(readerCursorKey) ?? 0;

            if (event.lastReadMessageId <= lastAppliedCursor) {
                return;
            }

            const effectivePreviousCursor = Math.max(
                event.previousLastReadMessageId ?? 0,
                lastAppliedCursor,
            );

            appliedReadCursorByUserRef.current.set(
                readerCursorKey,
                event.lastReadMessageId,
            );

            setMessages((currentMessages) =>
                currentMessages.map((message) => {
                    const isMessageFromReader =
                        (typeof event.readerUserId === "number" &&
                            message.senderUserId === event.readerUserId) ||
                        (typeof event.readerOpenChatMemberId === "number" &&
                            message.sender?.openChatMemberId ===
                                event.readerOpenChatMemberId);

                    if (
                        message.senderType === "SYSTEM" ||
                        message.messageType === "SYSTEM" ||
                        isMessageFromReader ||
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
        if (hasNewerRef.current) {
            return;
        }

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
        hasLoadedSuccessfullyRef.current = false;
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
        isLoadingNewer,
        hasNext,
        nextCursorId,
        hasNewer,
        newerCursorId,
        activeAnchorMessageId,
        loadErrorCode,
        sendErrorCode,
        loadMoreErrorCode,
        loadNewerErrorCode,
        retryTranslationErrorCode,
        retryingTranslationKeys,
        retryTranslationErrorKeys,
        reload: load,
        loadMoreMessages,
        loadNewerMessages,
        jumpToLatestMessages,
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
