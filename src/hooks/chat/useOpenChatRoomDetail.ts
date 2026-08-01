"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorCode } from "@/services/common/responseParser";
import { openChatService } from "@/services/chat/openChatService";
import type { OpenChatRoomDetail } from "@/types/chat";

export type OpenChatRoomDetailLoadErrorCode =
    | "NOT_FOUND"
    | "LOAD_FAILED";

interface UseOpenChatRoomDetailResult {
    room: OpenChatRoomDetail | null;
    isLoading: boolean;
    loadErrorCode: OpenChatRoomDetailLoadErrorCode | null;
    reload: () => Promise<OpenChatRoomDetail | null>;
    applyRoom: (room: OpenChatRoomDetail) => void;
}

function mapLoadError(error: unknown): OpenChatRoomDetailLoadErrorCode {
    return getApiErrorCode(error) === "OPEN_CHAT_ROOM_NOT_FOUND"
        ? "NOT_FOUND"
        : "LOAD_FAILED";
}

export function useOpenChatRoomDetail(
    roomId: number,
): UseOpenChatRoomDetailResult {
    const [room, setRoom] = useState<OpenChatRoomDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadErrorCode, setLoadErrorCode] =
        useState<OpenChatRoomDetailLoadErrorCode | null>(null);
    const requestSequenceRef = useRef(0);

    const reload = useCallback(async () => {
        const requestSequence = ++requestSequenceRef.current;
        setIsLoading(true);
        setLoadErrorCode(null);

        try {
            const detail = await openChatService.getRoomDetail(roomId);

            if (requestSequence !== requestSequenceRef.current) {
                return null;
            }

            setRoom(detail);
            return detail;
        } catch (error) {
            if (requestSequence !== requestSequenceRef.current) {
                return null;
            }

            console.error("Failed to load OPEN room detail.", error);
            setRoom(null);
            setLoadErrorCode(mapLoadError(error));
            return null;
        } finally {
            if (requestSequence === requestSequenceRef.current) {
                setIsLoading(false);
            }
        }
    }, [roomId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const applyRoom = useCallback((nextRoom: OpenChatRoomDetail) => {
        setRoom(nextRoom);
        setLoadErrorCode(null);
    }, []);

    return {
        room,
        isLoading,
        loadErrorCode,
        reload,
        applyRoom,
    };
}
