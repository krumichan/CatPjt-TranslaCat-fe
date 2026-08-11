"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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
import type { ChatPresenceChangedEvent } from "@/types/chatWebSocket";

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

interface PendingPresenceState {
    roomId: number;
    roomType: ChatRoomType | null;
    byMemberRef: ReadonlyMap<string, boolean>;
}

const EMPTY_PENDING_PRESENCE: ReadonlyMap<string, boolean> = new Map();

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
    applyPresenceChanged: (event: ChatPresenceChangedEvent) => Promise<void>;
}

export function useChatRoomMenu({
    roomId,
    roomType,
}: UseChatRoomMenuParams): UseChatRoomMenuResult {
    const [isOpen, setIsOpen] = useState(false);
    const [hasRequestedMembers, setHasRequestedMembers] = useState(false);
    const presenceOccurredAtByMemberRefRef = useRef(new Map<string, string>());
    const [pendingPresence, setPendingPresence] = useState<PendingPresenceState>(
        () => ({
            roomId,
            roomType,
            byMemberRef: new Map(),
        }),
    );
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
        setPendingPresence({
            roomId,
            roomType,
            byMemberRef: new Map(),
        });
        presenceOccurredAtByMemberRefRef.current.clear();
        await mutate(undefined, true);
    }, [mutate, roomId, roomType]);

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

            // Do not mutate an empty SWR cache while the initial member request
            // is still in flight. SWR treats mutate as a newer write and may
            // discard that request result. The pending-role overlay above is
            // intentionally enough until the initial snapshot is committed.
            if (!data) {
                return;
            }

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
        [data, mutate],
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

    const applyPresenceChanged = useCallback(
        async (event: ChatPresenceChangedEvent) => {
            if (event.roomId !== roomId || event.roomType !== roomType) {
                return;
            }

            const presenceEventKey = `${event.roomType}:${event.roomId}:${event.memberRef}`;
            const previousOccurredAt =
                presenceOccurredAtByMemberRefRef.current.get(presenceEventKey);
            if (
                previousOccurredAt &&
                Date.parse(event.occurredAt) < Date.parse(previousOccurredAt)
            ) {
                return;
            }

            presenceOccurredAtByMemberRefRef.current.set(
                presenceEventKey,
                event.occurredAt,
            );
            if (hasRequestedMembers) {
                setPendingPresence((current) => {
                    const next = new Map(
                        current.roomId === roomId &&
                        current.roomType === roomType
                            ? current.byMemberRef
                            : EMPTY_PENDING_PRESENCE,
                    );
                    next.set(event.memberRef, event.online);
                    return {
                        roomId,
                        roomType,
                        byMemberRef: next,
                    };
                });
            }

            // As with the role overlay, avoid invalidating the initial SWR
            // member request before it commits. Pending Presence will be
            // overlaid on the fetched snapshot once data becomes available.
            if (!data) {
                return;
            }

            await mutate(
                (currentData) => {
                    if (!currentData) {
                        return currentData;
                    }

                    if (event.roomType === "OPEN") {
                        return {
                            ...currentData,
                            openMembers: currentData.openMembers.map((member) =>
                                String(member.openChatMemberId) === event.memberRef
                                    ? { ...member, online: event.online }
                                    : member,
                            ),
                        };
                    }

                    if (event.roomType === "GROUP") {
                        return {
                            ...currentData,
                            members: currentData.members.map((member) =>
                                String(member.id) === event.memberRef
                                    ? { ...member, online: event.online }
                                    : member,
                            ),
                        };
                    }

                    return currentData;
                },
                false,
            );
        },
        [data, hasRequestedMembers, mutate, roomId, roomType],
    );

    const pendingPresenceByMemberRef =
        pendingPresence.roomId === roomId &&
        pendingPresence.roomType === roomType
            ? pendingPresence.byMemberRef
            : EMPTY_PENDING_PRESENCE;

    const openMembersWithPendingRoles = useMemo(() => {
        const members = data?.openMembers ?? [];

        if (pendingOpenChatRoles.size === 0) {
            return members;
        }

        // Keep the pre-Presence OPEN moderation path isolated. A role event can
        // arrive after the fetcher has built its response but before SWR commits
        // that response, so the latest role event must overlay the snapshot.
        return members.map((member) => {
            const pendingRole = pendingOpenChatRoles.get(
                member.openChatMemberId,
            );

            return pendingRole
                ? { ...member, role: pendingRole }
                : member;
        });
    }, [data?.openMembers, pendingOpenChatRoles]);

    const openMembers = useMemo(() => {
        if (pendingPresenceByMemberRef.size === 0) {
            return openMembersWithPendingRoles;
        }

        // Presence is a separate overlay so adding/removing Presence state cannot
        // change the existing OPEN role-update behavior.
        return openMembersWithPendingRoles.map((member) => {
            const pendingOnline = pendingPresenceByMemberRef.get(
                String(member.openChatMemberId),
            );

            return pendingOnline !== undefined
                ? { ...member, online: pendingOnline }
                : member;
        });
    }, [openMembersWithPendingRoles, pendingPresenceByMemberRef]);

    const members = useMemo(
        () =>
            (data?.members ?? []).map((member) => {
                const pendingOnline = pendingPresenceByMemberRef.get(
                    String(member.id),
                );

                return pendingOnline !== undefined
                    ? { ...member, online: pendingOnline }
                    : member;
            }),
        [data?.members, pendingPresenceByMemberRef],
    );

    return {
        isOpen,
        members,
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
        applyPresenceChanged,
    };
}
