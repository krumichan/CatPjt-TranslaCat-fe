"use client";

import { useCallback } from "react";

import { useQuery } from "@/hooks/useQuery";
import { openChatService } from "@/services/chat/openChatService";
import type {
    ChatRoomMemberRole,
    OpenChatMemberProfile,
    OpenChatProfileSnapshot,
} from "@/types/chat";

interface UseOpenChatMyProfileParams {
    roomId: number;
    enabled: boolean;
}

export function useOpenChatMyProfile({
    roomId,
    enabled,
}: UseOpenChatMyProfileParams) {
    const { data, isLoading, isError, mutate } = useQuery({
        keys: enabled
            ? (["open-chat-my-profile", roomId] as const)
            : null,
        fetcher: (_resource: string, targetRoomId: number) =>
            openChatService.getMyProfile(targetRoomId),
        enabled,
    });

    const reload = useCallback(async () => {
        await mutate(undefined, true);
    }, [mutate]);

    const applyProfile = useCallback(
        async (profile: OpenChatMemberProfile | OpenChatProfileSnapshot) => {
            await mutate(
                (current) =>
                    current?.openChatMemberId === profile.openChatMemberId
                        ? { ...current, ...profile }
                        : current,
                false,
            );
        },
        [mutate],
    );

    const applyRole = useCallback(
        async (openChatMemberId: number, role: ChatRoomMemberRole) => {
            await mutate(
                (current) =>
                    current?.openChatMemberId === openChatMemberId
                        ? { ...current, role }
                        : current,
                false,
            );
        },
        [mutate],
    );

    return {
        profile: data ?? null,
        isLoading,
        loadErrorCode: isError ? ("LOAD_FAILED" as const) : null,
        reload,
        applyProfile,
        applyRole,
    };
}
