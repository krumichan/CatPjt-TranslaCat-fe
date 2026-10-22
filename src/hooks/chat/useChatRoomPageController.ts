"use client";

import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { useChatAiMemberProfilePreview } from "@/hooks/chat/useChatAiMemberProfilePreview";
import { useChatAiRoomDisplayPolicy } from "@/hooks/chat/useChatAiRoomDisplayPolicy";
import { useChatLanguageSettings } from "@/hooks/chat/useChatLanguageSettings";
import { useChatMemberProfilePreview } from "@/hooks/chat/useChatMemberProfilePreview";
import { useChatPartnerProfilePreview } from "@/hooks/chat/useChatPartnerProfilePreview";
import { useChatRoom } from "@/hooks/chat/useChatRoom";
import { useChatRoomInvitation } from "@/hooks/chat/useChatRoomInvitation";
import { useChatRoomMenu } from "@/hooks/chat/useChatRoomMenu";
import { useChatRoomOpenChatCoordinator } from "@/hooks/chat/useChatRoomOpenChatCoordinator";
import { useChatRoomReadStatus } from "@/hooks/chat/useChatRoomReadStatus";
import { useChatRoomRealtime } from "@/hooks/chat/useChatRoomRealtime";
import { useOpenChatMemberProfilePreview } from "@/hooks/chat/useOpenChatMemberProfilePreview";
import { useOpenChatIdInvitation } from "@/hooks/chat/useOpenChatIdInvitation";
import { useOpenChatRoomLifecycle } from "@/hooks/chat/useOpenChatRoomLifecycle";
import type { OpenChatRoomDetail } from "@/types/chat";
import type { ChatPresenceChangedEvent } from "@/types/chatWebSocket";
import { isOpenChatModerator } from "@/utils/chat/openChatModeration";

export function useChatRoomPageController(
    roomId: number,
    initialFirstUnreadMessageId: number | null = null,
) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();
    const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] =
        useState(false);
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const presenceOccurredAtByMemberRefRef = useRef(new Map<string, string>());
    const [blacklistRequestedRoomId, setBlacklistRequestedRoomId] =
        useState<number | null>(() => {
            if (typeof window === "undefined") {
                return null;
            }
            return new URLSearchParams(window.location.search).get(
                "openBlacklist",
            ) === "1"
                ? roomId
                : null;
        });

    const partnerProfilePreview = useChatPartnerProfilePreview();
    const memberProfilePreview = useChatMemberProfilePreview({ roomId });
    const openMemberProfilePreview =
        useOpenChatMemberProfilePreview(roomId);

    const chatRoom = useChatRoom(roomId, initialFirstUnreadMessageId);
    const roomType = chatRoom.room?.roomType ?? null;
    const roomSourceType = chatRoom.room?.sourceType ?? null;
    const isOpenRoom = roomType === "OPEN";

    const languageSettings = useChatLanguageSettings(roomId);
    const hasAiMessage = chatRoom.messages.some(
        (message) => message.senderType === "AI",
    );
    const aiDisplayPolicy = useChatAiRoomDisplayPolicy({
        roomId,
        enabled:
            (roomType === "GROUP" || roomType === "OPEN") &&
            hasAiMessage,
    });
    const aiMemberProfilePreview = useChatAiMemberProfilePreview({ roomId });
    const { openProfile: openAiMemberProfile } = aiMemberProfilePreview;
    const { reload: reloadAiDisplayPolicy } = aiDisplayPolicy;
    const roomMenu = useChatRoomMenu({ roomId, roomType });

    const refreshOwnershipState = useCallback(async () => {
        await Promise.all([
            chatRoom.reload(),
            roomMenu.reloadMembers(),
        ]);
    }, [chatRoom, roomMenu]);

    const applyOwnerTransfer = useCallback(async (
        detail: OpenChatRoomDetail,
        targetOpenChatMemberId: number,
        isCurrentScope: () => boolean,
    ) => {
        // 서버가 확정한 역할을 즉시 반영한 뒤 방과 멤버 목록을 재조회한다.
        if (!isCurrentScope()) {
            return;
        }

        const previousOwnerId = detail.myOpenProfile?.openChatMemberId;
        if (previousOwnerId && detail.myRole) {
            chatRoom.applyOpenChatRole(previousOwnerId, detail.myRole, true);
            await roomMenu.applyOpenChatRole(previousOwnerId, detail.myRole);
        }

        if (!isCurrentScope()) {
            return;
        }

        await roomMenu.applyOpenChatRole(targetOpenChatMemberId, "OWNER");
        if (isCurrentScope()) {
            await refreshOwnershipState();
        }
    }, [chatRoom, refreshOwnershipState, roomMenu]);

    const openLifecycle = useOpenChatRoomLifecycle({
        roomId,
        room: chatRoom.room,
        openMembers: roomMenu.openMembers,
        isMembersLoading: roomMenu.isLoading,
        membersLoadErrorCode: roomMenu.loadErrorCode,
        onCloseRoomMenu: roomMenu.closeMenu,
        onRefreshState: refreshOwnershipState,
        onOwnerTransferred: applyOwnerTransfer,
    });

    const roomInvitation = useChatRoomInvitation({
        room: chatRoom.room,
        members: roomMenu.members,
        reloadRoom: chatRoom.reload,
        reloadMembers: roomMenu.reloadMembers,
    });

    const openChat = useChatRoomOpenChatCoordinator({
        roomId,
        room: chatRoom.room,
        isOpenRoom,
        chatRoomState: chatRoom,
        roomMenu,
        memberProfilePreview: openMemberProfilePreview,
        onRemoteRoomClosed: openLifecycle.handleRemoteClosed,
    });

    const canInviteOpenById =
        isOpenRoom &&
        chatRoom.room?.active === true &&
        openChat.myProfile.profile?.active === true &&
        !openChat.isBanned &&
        !openLifecycle.isRoomClosed;
    const openIdInvitation = useOpenChatIdInvitation(roomId, canInviteOpenById);
    const openOpenIdInvitation = useCallback(() => {
        roomMenu.closeMenu();
        openIdInvitation.open();
    }, [openIdInvitation, roomMenu]);

    const readStatus = useChatRoomReadStatus({
        roomId,
        enabled:
            !chatRoom.isLoading &&
            chatRoom.loadErrorCode === null &&
            chatRoom.room !== null &&
            !openChat.isBanned,
    });

    const jumpToLatestMessages = useCallback(async () => {
        const latestMessageId = await chatRoom.jumpToLatestMessages();
        if (latestMessageId === null) {
            return false;
        }

        await readStatus.markReadImmediately(latestMessageId);
        return true;
    }, [chatRoom, readStatus]);

    const handlePresenceChanged = useCallback(
        (event: ChatPresenceChangedEvent) => {
            if (event.roomId !== roomId || event.roomType !== roomType) {
                return;
            }

            const eventKey = `${event.roomId}:${event.roomType}:${event.memberRef}`;
            const previousOccurredAt =
                presenceOccurredAtByMemberRefRef.current.get(eventKey);
            if (
                previousOccurredAt &&
                Date.parse(event.occurredAt) < Date.parse(previousOccurredAt)
            ) {
                return;
            }

            presenceOccurredAtByMemberRefRef.current.set(
                eventKey,
                event.occurredAt,
            );

            chatRoom.applyPresenceChanged(event);
            void roomMenu.applyPresenceChanged(event);

            if (event.roomType === "DIRECT") {
                partnerProfilePreview.applyPresence(
                    event.memberRef,
                    event.online,
                );
                return;
            }

            if (event.roomType === "OPEN") {
                const openChatMemberId = Number(event.memberRef);
                if (Number.isFinite(openChatMemberId)) {
                    openMemberProfilePreview.applyPresence(
                        openChatMemberId,
                        event.online,
                    );
                }
                return;
            }

            const targetMember = roomMenu.members.find(
                (member) => String(member.id) === event.memberRef,
            );
            if (targetMember) {
                memberProfilePreview.applyPresence(
                    targetMember.userId,
                    event.online,
                );
                return;
            }

            if (memberProfilePreview.isOpen) {
                void memberProfilePreview.retryProfile();
            }
        },
        [
            chatRoom,
            memberProfilePreview,
            openMemberProfilePreview,
            partnerProfilePreview,
            roomId,
            roomMenu,
            roomType,
        ],
    );

    const syncAfterReconnect = useCallback(async () => {
        const tasks: Promise<unknown>[] = [
            openChat.syncAfterReconnect(),
            chatRoom.reload(),
        ];

        if (roomMenu.isOpen && roomType === "GROUP") {
            tasks.push(roomMenu.reloadMembers());
            tasks.push(memberProfilePreview.retryProfile());
        }

        await Promise.all(tasks);
    }, [
        chatRoom,
        memberProfilePreview,
        openChat,
        roomMenu,
        roomType,
    ]);

    const realtime = useChatRoomRealtime({
        roomId,
        accessToken: session?.accessToken ?? null,
        enabled: !openChat.isBanned,
        openChatEventsEnabled: isOpenRoom,
        isRestSending: chatRoom.isSending,
        restSendErrorCode: chatRoom.sendErrorCode,
        appendMessage: chatRoom.appendMessage,
        applyTranslationCompleted: chatRoom.applyTranslationCompleted,
        syncLatestMessages: syncAfterReconnect,
        onReadUpdated: readStatus.handleReadUpdated,
        onMemberReadUpdated: chatRoom.applyMemberReadUpdated,
        onRoomMembersChanged: () => {
            void roomMenu.reloadMembers();
        },
        onPresenceChanged: handlePresenceChanged,
        onOpenChatProfileUpdated: openChat.handleProfileUpdated,
        onOpenChatMemberRoleUpdated: openChat.handleMemberRoleUpdated,
        onOpenChatMemberBanned: openChat.handleMemberBanned,
        onCurrentUserOpenChatMemberBanned: openChat.handleBanned,
        onOpenChatRoomClosed: openChat.handleRoomClosed,
        sendRestMessage: chatRoom.sendMessage,
    });

    const directPartner = chatRoom.room?.directPartner ?? null;
    const canOpenPartnerProfile =
        roomType === "DIRECT" &&
        roomSourceType === "FRIEND" &&
        directPartner !== null;

    const openPartnerProfile = useCallback(() => {
        if (directPartner) {
            partnerProfilePreview.openProfilePreview(directPartner);
        }
    }, [directPartner, partnerProfilePreview]);

    const openAiMessageSenderProfile = useCallback(
        (aiMemberId: number) => {
            void openAiMemberProfile(aiMemberId);
        },
        [openAiMemberProfile],
    );

    const openMessageSenderProfile = useCallback(
        (senderProfileId: number) => {
            if (roomType === "OPEN") {
                void openMemberProfilePreview.openProfile(senderProfileId);
                return;
            }

            if (roomType === "GROUP") {
                void memberProfilePreview.openProfile(senderProfileId);
                return;
            }

            if (
                canOpenPartnerProfile &&
                directPartner?.userId === senderProfileId
            ) {
                partnerProfilePreview.openProfilePreview(directPartner);
            }
        },
        [
            canOpenPartnerProfile,
            directPartner,
            memberProfilePreview,
            openMemberProfilePreview,
            partnerProfilePreview,
            roomType,
        ],
    );

    const openMemberProfileFromMenu = useCallback(
        (userId: number) => {
            roomMenu.closeMenu();
            void memberProfilePreview.openProfile(userId);
        },
        [memberProfilePreview, roomMenu],
    );

    const openOpenMemberProfileFromMenu = useCallback(
        (openChatMemberId: number) => {
            roomMenu.closeMenu();
            void openMemberProfilePreview.openProfile(openChatMemberId);
        },
        [openMemberProfilePreview, roomMenu],
    );

    const canManageOpenChat = isOpenChatModerator(
        chatRoom.room?.myRole ?? null,
    );
    const canManageAi =
        (roomType === "GROUP" || roomType === "OPEN") &&
        (chatRoom.room?.myRole === "OWNER" || chatRoom.room?.myRole === "ADMIN");
    const canViewAiSettings = canManageAi;

    const openAiSettings = useCallback(() => {
        if (!canManageAi) return;
        roomMenu.closeMenu();
        setIsAiSettingsOpen(true);
    }, [canManageAi, roomMenu]);

    const closeAiSettings = useCallback(() => {
        setIsAiSettingsOpen(false);
        void reloadAiDisplayPolicy();
    }, [reloadAiDisplayPolicy]);

    const openBlacklist = useCallback(() => {
        roomMenu.closeMenu();
        setBlacklistRequestedRoomId(roomId);
    }, [roomId, roomMenu]);

    const closeBlacklist = useCallback(() => {
        setBlacklistRequestedRoomId(null);

        if (typeof window === "undefined") {
            return;
        }

        const nextSearchParams = new URLSearchParams(
            window.location.search,
        );
        if (nextSearchParams.get("openBlacklist") !== "1") {
            return;
        }

        nextSearchParams.delete("openBlacklist");
        const query = nextSearchParams.toString();
        window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
        );
    }, []);

    const isBlacklistOpen =
        blacklistRequestedRoomId === roomId &&
        isOpenRoom &&
        canManageOpenChat;

    const canOpenMessageSenderProfile =
        roomType === "OPEN" ||
        roomType === "GROUP" ||
        canOpenPartnerProfile;

    const canInviteMembers =
        (roomType === "GROUP" &&
            roomSourceType !== "OPEN" &&
            roomSourceType !== "AI" &&
            (chatRoom.room?.myRole === "OWNER" ||
                chatRoom.room?.myRole === "ADMIN")) ||
        (roomType === "DIRECT" && roomSourceType === "FRIEND");

    return {
        roomId,
        roomType,
        isOpenRoom,
        isLanguageSettingsOpen,
        openLanguageSettings: () => setIsLanguageSettingsOpen(true),
        closeLanguageSettings: () => setIsLanguageSettingsOpen(false),
        isAiSettingsOpen,
        openAiSettings,
        closeAiSettings,
        chatRoom,
        readStatus,
        jumpToLatestMessages,
        languageSettings,
        aiDisplayPolicy,
        aiMemberProfilePreview,
        roomMenu,
        roomInvitation,
        openIdInvitation,
        canInviteOpenById,
        openOpenIdInvitation,
        openLifecycle,
        openChat,
        realtime,
        partnerProfilePreview,
        memberProfilePreview,
        openMemberProfilePreview,
        currentUserEmail: session?.user?.email ?? null,
        sendErrorMessage: realtime.sendErrorCode
            ? t("input.sendFailed")
            : null,
        loadMoreErrorMessage: chatRoom.loadMoreErrorCode
            ? t("pagination.loadFailed")
            : null,
        loadNewerErrorMessage: chatRoom.loadNewerErrorCode
            ? t("pagination.loadNewerFailed")
            : null,
        canOpenPartnerProfile,
        canOpenMessageSenderProfile,
        canInviteMembers,
        canManageOpenChat,
        canViewAiSettings,
        canManageAi,
        openPartnerProfile,
        openMessageSenderProfile,
        openAiMessageSenderProfile,
        openMemberProfileFromMenu,
        openOpenMemberProfileFromMenu,
        blacklist: {
            isOpen: isBlacklistOpen,
            open: openBlacklist,
            close: closeBlacklist,
        },
        loadingMessage: t("loading"),
        errorTitle: t("error.title"),
        loadErrorMessage: chatRoom.loadErrorCode
            ? t("error.loadFailed")
            : t("error.notFound"),
        retryLabel: t("error.retry"),
    };
}

export type ChatRoomPageController = ReturnType<
    typeof useChatRoomPageController
>;
