"use client";

import { useCallback, useRef } from "react";

import type {
    ChatRoomMemberRole,
    OpenChatProfileSnapshot,
} from "@/types/chat";
import type {
    OpenChatMemberBannedEvent,
    OpenChatMemberRoleUpdatedEvent,
    OpenChatProfileUpdatedEvent,
    OpenChatRoomClosedEvent,
} from "@/types/chatWebSocket";

interface UseOpenChatRoomEventHandlersParams {
    roomId: number;
    currentOpenChatMemberId: number | null;
    onApplyProfile: (profile: OpenChatProfileSnapshot) => Promise<void>;
    onApplyRole: (
        openChatMemberId: number,
        role: ChatRoomMemberRole,
        isCurrentUser: boolean,
    ) => void;
    onRemoveMember: (openChatMemberId: number) => Promise<void>;
    onCurrentUserBanned: () => void;
    onRoomClosed: () => void;
}

export function useOpenChatRoomEventHandlers({
    roomId,
    currentOpenChatMemberId,
    onApplyProfile,
    onApplyRole,
    onRemoveMember,
    onCurrentUserBanned,
    onRoomClosed,
}: UseOpenChatRoomEventHandlersParams) {
    const latestProfileEventAtRef = useRef(new Map<number, number>());
    const latestRoleEventAtRef = useRef(new Map<number, number>());

    const handleMemberRoleUpdated = useCallback(
        (event: OpenChatMemberRoleUpdatedEvent) => {
            if (event.roomId !== roomId) {
                return;
            }

            const occurredAt = new Date(event.occurredAt).getTime();
            const previousOccurredAt =
                latestRoleEventAtRef.current.get(
                    event.targetOpenChatMemberId,
                ) ?? 0;

            if (
                Number.isFinite(occurredAt) &&
                occurredAt <= previousOccurredAt
            ) {
                return;
            }

            if (Number.isFinite(occurredAt)) {
                latestRoleEventAtRef.current.set(
                    event.targetOpenChatMemberId,
                    occurredAt,
                );
            }

            onApplyRole(
                event.targetOpenChatMemberId,
                event.role,
                currentOpenChatMemberId ===
                    event.targetOpenChatMemberId,
            );
        },
        [currentOpenChatMemberId, onApplyRole, roomId],
    );

    const handleMemberBanned = useCallback(
        (event: OpenChatMemberBannedEvent) => {
            if (event.roomId !== roomId) {
                return;
            }

            void onRemoveMember(event.targetOpenChatMemberId);

            if (
                currentOpenChatMemberId ===
                event.targetOpenChatMemberId
            ) {
                onCurrentUserBanned();
            }
        },
        [
            currentOpenChatMemberId,
            onCurrentUserBanned,
            onRemoveMember,
            roomId,
        ],
    );

    const handleProfileUpdated = useCallback(
        (event: OpenChatProfileUpdatedEvent) => {
            if (event.roomId !== roomId) {
                return;
            }

            const occurredAt = new Date(event.occurredAt).getTime();
            const previousOccurredAt =
                latestProfileEventAtRef.current.get(
                    event.openChatMemberId,
                ) ?? 0;

            if (
                Number.isFinite(occurredAt) &&
                occurredAt <= previousOccurredAt
            ) {
                return;
            }

            if (Number.isFinite(occurredAt)) {
                latestProfileEventAtRef.current.set(
                    event.openChatMemberId,
                    occurredAt,
                );
            }

            void onApplyProfile({
                openChatMemberId: event.openChatMemberId,
                memberCode: event.memberCode,
                nickname: event.nickname,
                profileImageUrl: event.profileImageUrl,
                role: event.role,
            });
        },
        [onApplyProfile, roomId],
    );

    const handleRoomClosed = useCallback(
        (event: OpenChatRoomClosedEvent) => {
            if (event.roomId === roomId) {
                onRoomClosed();
            }
        },
        [onRoomClosed, roomId],
    );

    return {
        handleProfileUpdated,
        handleMemberRoleUpdated,
        handleMemberBanned,
        handleRoomClosed,
    };
}
