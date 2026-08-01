"use client";

import { useCallback, useState } from "react";

import type { useChatRoom } from "@/hooks/chat/useChatRoom";
import type { useChatRoomMenu } from "@/hooks/chat/useChatRoomMenu";
import { useOpenChatBannedRecovery } from "@/hooks/chat/useOpenChatBannedRecovery";
import type { useOpenChatMemberProfilePreview } from "@/hooks/chat/useOpenChatMemberProfilePreview";
import { useOpenChatModeration } from "@/hooks/chat/useOpenChatModeration";
import { useOpenChatMyProfile } from "@/hooks/chat/useOpenChatMyProfile";
import { useOpenChatRoomEventHandlers } from "@/hooks/chat/useOpenChatRoomEventHandlers";
import type {
    ChatRoom,
    ChatRoomMemberRole,
    OpenChatMemberProfile,
    OpenChatProfileSnapshot,
} from "@/types/chat";

type ChatRoomState = ReturnType<typeof useChatRoom>;
type ChatRoomMenuState = ReturnType<typeof useChatRoomMenu>;
type OpenChatMemberProfilePreviewState = ReturnType<
    typeof useOpenChatMemberProfilePreview
>;

interface UseChatRoomOpenChatCoordinatorParams {
    roomId: number;
    room: ChatRoom | null;
    isOpenRoom: boolean;
    chatRoomState: Pick<
        ChatRoomState,
        | "applyOpenChatProfile"
        | "applyOpenChatRole"
        | "removeOpenChatMember"
        | "reload"
        | "syncLatestMessages"
    >;
    roomMenu: Pick<
        ChatRoomMenuState,
        | "applyOpenChatProfile"
        | "applyOpenChatRole"
        | "removeOpenChatMember"
        | "reloadMembers"
        | "closeMenu"
    >;
    memberProfilePreview: Pick<
        OpenChatMemberProfilePreviewState,
        | "applyProfile"
        | "applyRole"
        | "removeMember"
        | "retryProfile"
        | "closeProfile"
    >;
    onRemoteRoomClosed: () => void;
}

export function useChatRoomOpenChatCoordinator({
    roomId,
    room,
    isOpenRoom,
    chatRoomState,
    roomMenu,
    memberProfilePreview,
    onRemoteRoomClosed,
}: UseChatRoomOpenChatCoordinatorParams) {
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
    const {
        applyOpenChatProfile,
        applyOpenChatRole,
        removeOpenChatMember,
        reload: reloadRoom,
        syncLatestMessages,
    } = chatRoomState;
    const {
        applyOpenChatProfile: applyProfileToMenu,
        applyOpenChatRole: applyRoleToMenu,
        removeOpenChatMember: removeMemberFromMenu,
        reloadMembers,
        closeMenu,
    } = roomMenu;
    const {
        applyProfile: applyProfileToPreview,
        applyRole: applyRoleToPreview,
        removeMember: removeMemberFromPreview,
        retryProfile,
        closeProfile,
    } = memberProfilePreview;

    const myProfile = useOpenChatMyProfile({
        roomId,
        enabled: isOpenRoom,
    });
    const {
        profile,
        applyProfile: applyMyProfile,
        applyRole: applyMyRole,
        reload: reloadMyProfile,
    } = myProfile;

    const applyProfileEverywhere = useCallback(
        async (
            nextProfile: OpenChatMemberProfile | OpenChatProfileSnapshot,
        ) => {
            applyOpenChatProfile(nextProfile);
            applyProfileToPreview(nextProfile);
            await Promise.all([
                applyMyProfile(nextProfile),
                applyProfileToMenu(nextProfile),
            ]);
        },
        [
            applyMyProfile,
            applyOpenChatProfile,
            applyProfileToMenu,
            applyProfileToPreview,
        ],
    );

    const removeMemberEverywhere = useCallback(
        async (openChatMemberId: number) => {
            applyOpenChatRole(openChatMemberId, "MEMBER", false);
            removeOpenChatMember(openChatMemberId);
            removeMemberFromPreview(openChatMemberId);
            await removeMemberFromMenu(openChatMemberId);
        },
        [
            applyOpenChatRole,
            removeMemberFromMenu,
            removeMemberFromPreview,
            removeOpenChatMember,
        ],
    );

    const reloadModerationState = useCallback(async () => {
        await Promise.all([
            reloadRoom(),
            reloadMembers(),
            reloadMyProfile(),
            retryProfile(),
        ]);
    }, [reloadMembers, reloadMyProfile, reloadRoom, retryProfile]);

    const moderation = useOpenChatModeration({
        roomId,
        onMemberUpdated: applyProfileEverywhere,
        onMemberRemoved: removeMemberEverywhere,
        onReloadState: reloadModerationState,
    });
    const closeModeration = moderation.close;

    const handleBeforeBannedRedirect = useCallback(() => {
        closeModeration();
        closeMenu();
        closeProfile();
        setIsProfileEditOpen(false);
    }, [closeMenu, closeModeration, closeProfile]);

    const { isBanned, handleBanned } = useOpenChatBannedRecovery({
        roomId,
        enabled: true,
        onBeforeRedirect: handleBeforeBannedRedirect,
    });

    const applyRoleEverywhere = useCallback(
        (
            openChatMemberId: number,
            role: ChatRoomMemberRole,
            isCurrentUser: boolean,
        ) => {
            applyOpenChatRole(
                openChatMemberId,
                role,
                isCurrentUser,
            );
            applyRoleToPreview(openChatMemberId, role);
            void Promise.all([
                applyRoleToMenu(openChatMemberId, role),
                applyMyRole(openChatMemberId, role),
            ]);

            if (isCurrentUser && role === "MEMBER") {
                closeModeration();
            }
        },
        [
            applyMyRole,
            applyOpenChatRole,
            applyRoleToMenu,
            applyRoleToPreview,
            closeModeration,
        ],
    );

    const handleRoomClosedLocally = useCallback(() => {
        setIsProfileEditOpen(false);
        onRemoteRoomClosed();
    }, [onRemoteRoomClosed]);

    const roomEvents = useOpenChatRoomEventHandlers({
        roomId,
        currentOpenChatMemberId: profile?.openChatMemberId ?? null,
        onApplyProfile: applyProfileEverywhere,
        onApplyRole: applyRoleEverywhere,
        onRemoveMember: removeMemberEverywhere,
        onCurrentUserBanned: handleBanned,
        onRoomClosed: handleRoomClosedLocally,
    });

    const syncAfterReconnect = useCallback(async () => {
        const tasks: Promise<unknown>[] = [syncLatestMessages()];

        if (isOpenRoom) {
            tasks.push(reloadMyProfile());
            tasks.push(reloadMembers());
            tasks.push(retryProfile());
        }

        await Promise.all(tasks);
    }, [
        isOpenRoom,
        reloadMembers,
        reloadMyProfile,
        retryProfile,
        syncLatestMessages,
    ]);

    const openMyProfileEditor = useCallback(() => {
        closeMenu();
        setIsProfileEditOpen(true);
        if (!profile) {
            void reloadMyProfile();
        }
    }, [closeMenu, profile, reloadMyProfile]);

    const closeMyProfileEditor = useCallback(() => {
        setIsProfileEditOpen(false);
    }, []);

    const handleLocalProfileChanged = useCallback(
        async (nextProfile: OpenChatMemberProfile) => {
            await applyProfileEverywhere(nextProfile);
        },
        [applyProfileEverywhere],
    );

    const reloadAccessState = useCallback(async () => {
        await Promise.all([reloadRoom(), reloadMyProfile()]);
    }, [reloadMyProfile, reloadRoom]);

    return {
        room,
        myProfile,
        moderation,
        isBanned,
        handleBanned,
        isProfileEditOpen,
        openMyProfileEditor,
        closeMyProfileEditor,
        handleLocalProfileChanged,
        reloadAccessState,
        ...roomEvents,
        syncAfterReconnect,
    };
}
