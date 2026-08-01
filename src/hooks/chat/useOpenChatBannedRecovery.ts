"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "@/navigation";
import {
    API_RESPONSE_ERROR_EVENT,
    type ApiResponseErrorEventDetail,
} from "@/services/common/apiErrorEvent";

const BANNED_ERROR_CODES = new Set([
    "OPEN_CHAT_BANNED",
    "OPEN_CHAT_MEMBER_BANNED",
]);

interface UseOpenChatBannedRecoveryParams {
    roomId: number;
    enabled: boolean;
    onBeforeRedirect?: () => void;
}

export function useOpenChatBannedRecovery({
    roomId,
    enabled,
    onBeforeRedirect,
}: UseOpenChatBannedRecoveryParams) {
    const router = useRouter();
    const handledRoomIdRef = useRef<number | null>(null);
    const [bannedRoomId, setBannedRoomId] = useState<number | null>(null);

    const handleBanned = useCallback(() => {
        if (!enabled || handledRoomIdRef.current === roomId) {
            return;
        }

        handledRoomIdRef.current = roomId;
        setBannedRoomId(roomId);
        onBeforeRedirect?.();
        router.replace(`/chat/open/${roomId}?notice=banned`);
    }, [enabled, onBeforeRedirect, roomId, router]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleApiError = (event: Event) => {
            const detail = (
                event as CustomEvent<ApiResponseErrorEventDetail>
            ).detail;

            if (!detail || !BANNED_ERROR_CODES.has(detail.errorCode ?? "")) {
                return;
            }

            const roomPathMatches =
                !detail.url ||
                detail.url.includes(`/chat/open-rooms/${roomId}`) ||
                detail.url.includes(`/chat/rooms/${roomId}`);

            if (roomPathMatches) {
                handleBanned();
            }
        };

        window.addEventListener(API_RESPONSE_ERROR_EVENT, handleApiError);
        return () =>
            window.removeEventListener(API_RESPONSE_ERROR_EVENT, handleApiError);
    }, [enabled, handleBanned, roomId]);

    return {
        isBanned: enabled && bannedRoomId === roomId,
        handleBanned,
    };
}
