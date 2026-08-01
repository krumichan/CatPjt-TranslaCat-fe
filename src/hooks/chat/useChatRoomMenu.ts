"use client";

import { useCallback, useRef, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { chatRoomMemberService } from "@/services/chat/chatRoomMemberService";
import { openChatService } from "@/services/chat/openChatService";
import type {
    ChatRoomMember,
    ChatRoomMemberRole,
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
    applyOpenChatRole: (
        openChatMemberId: number,
        role: ChatRoomMemberRole,
    ) => Promise<void>;
    removeOpenChatMember: (openChatMemberId: number) => Promise<void>;
}

export function useChatRoomMenu({
    roomId,
    roomType,
}: UseChatRoomMenuParams): UseChatRoomMenuResult {
    const [isOpen, setIsOpen] = useState(false);
    const [hasRequestedMembers, setHasRequestedMembers] = useState(false);
    const pendingOpenChatRolesRef = useRef(
        new Map<number, ChatRoomMemberRole>(),
    );

    const applyPendingOpenChatRoles = useCallback(
        (members: OpenChatMemberProfile[]) =>
            members.map((member) => {
                const pendingRole = pendingOpenChatRolesRef.current.get(
                    member.openChatMemberId,
                );

                return pendingRole
                    ? { ...member, role: pendingRole }
                    : member;
            }),
        [],
    );

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
                    openMembers: applyPendingOpenChatRoles(
                        response.members,
                    ),
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
        pendingOpenChatRolesRef.current.clear();
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

    const applyOpenChatRole = useCallback(
        async (openChatMemberId: number, role: ChatRoomMemberRole) => {
            pendingOpenChatRolesRef.current.set(
                openChatMemberId,
                role,
            );

            await mutate(
                (currentData) =>
                    currentData
                        ? {
                              ...currentData,
                              openMembers: currentData.openMembers.map((member) =>
                                  member.openChatMemberId === openChatMemberId
                                      ? { ...member, role }
                                      : member,
                              ),
                          }
                        : currentData,
                false,
            );
        },
        [mutate],
    );

    const removeOpenChatMember = useCallback(
        async (openChatMemberId: number) => {
            await mutate(
                (currentData) =>
                    currentData
                        ? {
                              ...currentData,
                              openMembers: currentData.openMembers.filter(
                                  (member) =>
                                      member.openChatMemberId !== openChatMemberId,
                              ),
                          }
                        : currentData,
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
        applyOpenChatRole,
        removeOpenChatMember,
    };
}
