"use client";

import { useCallback, useMemo, useState } from "react";

import { useQuery } from "@/hooks/useQuery";
import { chatRoomMemberService } from "@/services/chat/chatRoomMemberService";
import { openChatService } from "@/services/chat/openChatService";
import type {
    ChatAiDisclosureType,
    ChatAiDisplayMember,
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
    aiMembers: ChatAiDisplayMember[];
    aiDisclosureType: ChatAiDisclosureType | null;
}

interface UseChatRoomMenuResult {
    isOpen: boolean;
    members: ChatRoomMember[];
    openMembers: OpenChatMemberProfile[];
    aiMembers: ChatAiDisplayMember[];
    aiDisclosureType: ChatAiDisclosureType | null;
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
    const [pendingOpenChatRoles, setPendingOpenChatRoles] = useState<
        ReadonlyMap<number, ChatRoomMemberRole>
    >(() => new Map());

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
                    aiMembers: response.aiMembers ?? [],
                    aiDisclosureType: response.aiDisclosureType ?? null,
                };
            }

            const response = await chatRoomMemberService.getMembers(
                targetRoomId,
            );
            return {
                members: response.members,
                openMembers: [],
                aiMembers: response.aiMembers ?? [],
                aiDisclosureType: response.aiDisclosureType ?? null,
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
        setPendingOpenChatRoles(new Map());
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
            setPendingOpenChatRoles((currentRoles) => {
                const nextRoles = new Map(currentRoles);
                nextRoles.set(openChatMemberId, role);
                return nextRoles;
            });

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
            setPendingOpenChatRoles((currentRoles) => {
                if (!currentRoles.has(openChatMemberId)) {
                    return currentRoles;
                }

                const nextRoles = new Map(currentRoles);
                nextRoles.delete(openChatMemberId);
                return nextRoles;
            });

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

    const openMembers = useMemo(() => {
        const members = data?.openMembers ?? [];

        if (pendingOpenChatRoles.size === 0) {
            return members;
        }

        // A role event can arrive after the fetcher has built its response but
        // before SWR commits that response. Keep the latest role event in React
        // state and overlay it on the committed snapshot so a stale fetch cannot
        // win that race.
        return members.map((member) => {
            const pendingRole = pendingOpenChatRoles.get(
                member.openChatMemberId,
            );

            return pendingRole
                ? { ...member, role: pendingRole }
                : member;
        });
    }, [data?.openMembers, pendingOpenChatRoles]);

    return {
        isOpen,
        members: data?.members ?? [],
        openMembers,
        aiMembers: data?.aiMembers ?? [],
        aiDisclosureType: data?.aiDisclosureType ?? null,
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
