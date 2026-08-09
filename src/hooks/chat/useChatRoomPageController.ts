"use client";

import { useCallback, useState } from "react";
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
import { useOpenChatRoomLifecycle } from "@/hooks/chat/useOpenChatRoomLifecycle";
import { isOpenChatModerator } from "@/utils/chat/openChatModeration";

export function useChatRoomPageController(roomId: number) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();
    const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] =
        useState(false);
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
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

    const chatRoom = useChatRoom(roomId);
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

    const openLifecycle = useOpenChatRoomLifecycle({
        roomId,
        room: chatRoom.room,
        openMembers: roomMenu.openMembers,
        isMembersLoading: roomMenu.isLoading,
        onCloseRoomMenu: roomMenu.closeMenu,
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

    const readStatus = useChatRoomReadStatus({
        roomId,
        messages: chatRoom.messages,
        enabled:
            !chatRoom.isLoading &&
            chatRoom.loadErrorCode === null &&
            chatRoom.room !== null &&
            !openChat.isBanned,
    });

    const realtime = useChatRoomRealtime({
        roomId,
        accessToken: session?.accessToken ?? null,
        enabled: !openChat.isBanned,
        openChatEventsEnabled: isOpenRoom,
        isRestSending: chatRoom.isSending,
        restSendErrorCode: chatRoom.sendErrorCode,
        appendMessage: chatRoom.appendMessage,
        applyTranslationCompleted: chatRoom.applyTranslationCompleted,
        syncLatestMessages: openChat.syncAfterReconnect,
        onReadUpdated: readStatus.handleReadUpdated,
        onMemberReadUpdated: chatRoom.applyMemberReadUpdated,
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
    const canViewAiSettings = roomType === "GROUP" || roomType === "OPEN";
    const canManageAi =
        canViewAiSettings &&
        (chatRoom.room?.myRole === "OWNER" || chatRoom.room?.myRole === "ADMIN");

    const openAiSettings = useCallback(() => {
        if (!canViewAiSettings) return;
        roomMenu.closeMenu();
        setIsAiSettingsOpen(true);
    }, [canViewAiSettings, roomMenu]);

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
        languageSettings,
        aiDisplayPolicy,
        aiMemberProfilePreview,
        roomMenu,
        roomInvitation,
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
