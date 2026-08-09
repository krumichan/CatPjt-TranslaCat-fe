"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { chatAiService } from "@/services/chat/chatAiService";
import type { ChatRoomAiSetting } from "@/types/chat";

export type ChatAiRoomDisplayPolicyLoadErrorCode = "LOAD_FAILED";

interface UseChatAiRoomDisplayPolicyParams {
    roomId: number;
    enabled: boolean;
}

export function useChatAiRoomDisplayPolicy({
    roomId,
    enabled,
}: UseChatAiRoomDisplayPolicyParams) {
    const [setting, setSetting] = useState<ChatRoomAiSetting | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatAiRoomDisplayPolicyLoadErrorCode | null>(null);
    const requestSequenceRef = useRef(0);

    const reload = useCallback(async () => {
        if (!enabled) {
            setSetting(null);
            setLoadErrorCode(null);
            setIsLoading(false);
            return false;
        }

        const requestSequence = ++requestSequenceRef.current;
        setIsLoading(true);
        setLoadErrorCode(null);

        try {
            const nextSetting = await chatAiService.getRoomSettings(roomId);

            if (requestSequence !== requestSequenceRef.current) {
                return false;
            }

            setSetting(nextSetting);
            return true;
        } catch (error) {
            console.error("Failed to load chat AI display policy.", error);

            if (requestSequence === requestSequenceRef.current) {
                setSetting(null);
                setLoadErrorCode("LOAD_FAILED");
            }

            return false;
        } finally {
            if (requestSequence === requestSequenceRef.current) {
                setIsLoading(false);
            }
        }
    }, [enabled, roomId]);

    useEffect(() => {
        if (!enabled) {
            requestSequenceRef.current += 1;
            setSetting(null);
            setLoadErrorCode(null);
            setIsLoading(false);
            return;
        }

        void reload();
    }, [enabled, reload]);

    return {
        setting,
        isLoading,
        loadErrorCode,
        reload,
    };
}
