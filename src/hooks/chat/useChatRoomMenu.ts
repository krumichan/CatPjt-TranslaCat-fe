"use client";

import { useCallback, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { chatRoomMemberService } from "@/services/chat/chatRoomMemberService";
import { openChatService } from "@/services/chat/openChatService";
import type {
    ChatRoomMember,
    ChatRoomType,
    OpenChatMemberProfile,
    OpenChatProfileSnapshot,
} from "@/types/chat";

export type ChatRoomMenuLoadErrorCode = "LOAD_FAILED";

interface UseChatRoomMenuParams {
    roomId: number;
    roomType: ChatRoomType | null;
}

interface ChatRoomMenuData {
    members: ChatRoomMember[];
    openMembers: OpenChatMemberProfile[];
}

interface UseChatRoomMenuResult {
    isOpen: boolean;
    members: ChatRoomMember[];
    openMembers: OpenChatMemberProfile[];
    isLoading: boolean;
    loadErrorCode: ChatRoomMenuLoadErrorCode | null;
    openMenu: () => void;
    closeMenu: () => void;
    reloadMembers: () => Promise<void>;
    applyOpenChatProfile: (
        profile: OpenChatMemberProfile | OpenChatProfileSnapshot,
    ) => Promise<void>;
}

export function useChatRoomMenu({
    roomId,
    roomType,
}: UseChatRoomMenuParams): UseChatRoomMenuResult {
    const [isOpen, setIsOpen] = useState(false);
    const [hasRequestedMembers, setHasRequestedMembers] = useState(false);

    const { data, isLoading, isError, mutate } = useQuery<
        ChatRoomMenuData,
        readonly [string, number, ChatRoomType]
    >({
        keys:
            hasRequestedMembers && roomType
                ? (["chat-room-menu-members", roomId, roomType] as const)
                : null,
        fetcher: async (
            _resource: string,
            targetRoomId: number,
            targetRoomType: ChatRoomType,
        ) => {
            if (targetRoomType === "OPEN") {
                const response = await openChatService.getMembers(
                    targetRoomId,
                );
                return {
                    members: [],
                    openMembers: response.members,
                };
            }

            const response = await chatRoomMemberService.getMembers(
                targetRoomId,
            );
            return {
                members: response.members,
                openMembers: [],
            };
        },
    });

    const openMenu = useCallback(() => {
        setHasRequestedMembers(true);
        setIsOpen(true);
    }, []);

    const closeMenu = useCallback(() => {
        setIsOpen(false);
    }, []);

    const reloadMembers = useCallback(async () => {
        await mutate(undefined, true);
    }, [mutate]);

    const applyOpenChatProfile = useCallback(
        async (profile: OpenChatMemberProfile | OpenChatProfileSnapshot) => {
            await mutate(
                (currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    return {
                        ...currentData,
                        openMembers: currentData.openMembers.map((member) =>
                            member.openChatMemberId ===
                            profile.openChatMemberId
                                ? { ...member, ...profile }
                                : member,
                        ),
                    };
                },
                false,
            );
        },
        [mutate],
    );

    return {
        isOpen,
        members: data?.members ?? [],
        openMembers: data?.openMembers ?? [],
        isLoading,
        loadErrorCode: isError ? "LOAD_FAILED" : null,
        openMenu,
        closeMenu,
        reloadMembers,
        applyOpenChatProfile,
    };
}
