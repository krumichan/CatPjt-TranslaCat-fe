"use client";

import { useCallback, useRef, useState } from "react";

import { chatAiService } from "@/services/chat/chatAiService";
import type { ChatAiMember } from "@/types/chat";

export type ChatAiMemberProfileLoadErrorCode = "LOAD_FAILED";

interface UseChatAiMemberProfilePreviewParams {
    roomId: number;
}

export function useChatAiMemberProfilePreview({
    roomId,
}: UseChatAiMemberProfilePreviewParams) {
    const [selectedAiMemberId, setSelectedAiMemberId] =
        useState<number | null>(null);
    const [profile, setProfile] = useState<ChatAiMember | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadErrorCode, setLoadErrorCode] =
        useState<ChatAiMemberProfileLoadErrorCode | null>(null);
    const requestSequenceRef = useRef(0);

    const openProfile = useCallback(
        async (aiMemberId: number) => {
            const requestSequence = ++requestSequenceRef.current;

            setSelectedAiMemberId(aiMemberId);
            setProfile(null);
            setLoadErrorCode(null);
            setIsLoading(true);

            try {
                const nextProfile = await chatAiService.getMember(
                    roomId,
                    aiMemberId,
                );

                if (requestSequence !== requestSequenceRef.current) {
                    return false;
                }

                setProfile(nextProfile);
                return true;
            } catch (error) {
                console.error("Failed to load chat AI member profile.", error);

                if (requestSequence === requestSequenceRef.current) {
                    setLoadErrorCode("LOAD_FAILED");
                }

                return false;
            } finally {
                if (requestSequence === requestSequenceRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [roomId],
    );

    const retryProfile = useCallback(async () => {
        if (selectedAiMemberId === null) {
            return false;
        }

        return openProfile(selectedAiMemberId);
    }, [openProfile, selectedAiMemberId]);

    const closeProfile = useCallback(() => {
        requestSequenceRef.current += 1;
        setSelectedAiMemberId(null);
        setProfile(null);
        setLoadErrorCode(null);
        setIsLoading(false);
    }, []);

    return {
        selectedAiMemberId,
        profile,
        isOpen: selectedAiMemberId !== null,
        isLoading,
        loadErrorCode,
        openProfile,
        retryProfile,
        closeProfile,
    };
}
