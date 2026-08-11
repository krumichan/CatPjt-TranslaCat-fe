"use client";

import { useCallback, useEffect, useRef } from "react";

import { usePageActivity } from "@/hooks/chat/usePageActivity";
import { chatService } from "@/services/chat/chatService";
import type { ChatReadUpdatedEvent } from "@/types/chatWebSocket";

const READ_REQUEST_DEBOUNCE_MS = 180;

interface UseChatRoomReadStatusParams {
    roomId: number;
    enabled: boolean;
}

export function useChatRoomReadStatus({
    roomId,
    enabled,
}: UseChatRoomReadStatusParams) {
    const isPageActive = usePageActivity();
    const isPageActiveRef = useRef(isPageActive);
    const isRequestInFlightRef = useRef(false);
    const pendingMessageIdRef = useRef<number | null>(null);
    const lastSucceededMessageIdRef = useRef(0);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);

    const clearDebounceTimer = useCallback(() => {
        if (debounceTimerRef.current !== null) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);

    const flushReadRequest = useCallback(async () => {
        if (
            !enabled ||
            !isPageActiveRef.current ||
            isRequestInFlightRef.current
        ) {
            return;
        }

        const targetMessageId = pendingMessageIdRef.current;

        if (
            targetMessageId === null ||
            targetMessageId <= lastSucceededMessageIdRef.current
        ) {
            return;
        }

        pendingMessageIdRef.current = null;
        isRequestInFlightRef.current = true;

        let succeeded = false;

        try {
            const response = await chatService.markRoomAsRead(roomId, {
                lastReadMessageId: targetMessageId,
            });

            lastSucceededMessageIdRef.current = Math.max(
                lastSucceededMessageIdRef.current,
                response.lastReadMessageId,
            );
            succeeded = true;
        } catch (error) {
            console.error("Failed to update chat read status.", error);
            pendingMessageIdRef.current = Math.max(
                pendingMessageIdRef.current ?? 0,
                targetMessageId,
            );
        } finally {
            isRequestInFlightRef.current = false;
        }

        if (
            succeeded &&
            pendingMessageIdRef.current !== null &&
            pendingMessageIdRef.current <= lastSucceededMessageIdRef.current
        ) {
            pendingMessageIdRef.current = null;
        }

        if (
            succeeded &&
            isMountedRef.current &&
            isPageActiveRef.current &&
            pendingMessageIdRef.current !== null &&
            pendingMessageIdRef.current > lastSucceededMessageIdRef.current
        ) {
            void flushReadRequest();
        }
    }, [enabled, roomId]);

    const scheduleRead = useCallback(
        (messageId: number) => {
            if (
                !enabled ||
                !Number.isSafeInteger(messageId) ||
                messageId <= 0 ||
                messageId <= lastSucceededMessageIdRef.current
            ) {
                return;
            }

            pendingMessageIdRef.current = Math.max(
                pendingMessageIdRef.current ?? 0,
                messageId,
            );

            if (!isPageActiveRef.current) {
                return;
            }

            clearDebounceTimer();
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                void flushReadRequest();
            }, READ_REQUEST_DEBOUNCE_MS);
        },
        [clearDebounceTimer, enabled, flushReadRequest],
    );

    const markReadImmediately = useCallback(
        async (messageId: number) => {
            if (
                !enabled ||
                !isPageActiveRef.current ||
                !Number.isSafeInteger(messageId) ||
                messageId <= 0 ||
                messageId <= lastSucceededMessageIdRef.current
            ) {
                return;
            }

            pendingMessageIdRef.current = Math.max(
                pendingMessageIdRef.current ?? 0,
                messageId,
            );
            clearDebounceTimer();
            await flushReadRequest();
        },
        [clearDebounceTimer, enabled, flushReadRequest],
    );

    const handleReadUpdated = useCallback(
        (event: ChatReadUpdatedEvent) => {
            if (event.chatRoomId !== roomId) {
                return;
            }

            lastSucceededMessageIdRef.current = Math.max(
                lastSucceededMessageIdRef.current,
                event.lastReadMessageId,
            );

            if (
                pendingMessageIdRef.current !== null &&
                pendingMessageIdRef.current <=
                    lastSucceededMessageIdRef.current
            ) {
                pendingMessageIdRef.current = null;
            }
        },
        [roomId],
    );

    useEffect(() => {
        isPageActiveRef.current = isPageActive;

        if (!isPageActive) {
            clearDebounceTimer();
            return;
        }

        if (
            pendingMessageIdRef.current !== null &&
            pendingMessageIdRef.current > lastSucceededMessageIdRef.current
        ) {
            void flushReadRequest();
        }
    }, [clearDebounceTimer, flushReadRequest, isPageActive]);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            clearDebounceTimer();
        };
    }, [clearDebounceTimer]);

    useEffect(() => {
        lastSucceededMessageIdRef.current = 0;
        pendingMessageIdRef.current = null;
        clearDebounceTimer();
    }, [clearDebounceTimer, roomId]);

    return {
        isPageActive,
        handleMessageVisible: scheduleRead,
        markReadImmediately,
        handleReadUpdated,
    };
}
