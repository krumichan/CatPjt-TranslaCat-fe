"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import { OpenChatMemberProfileModal } from "@/components/chat/open-profile/OpenChatMemberProfileModal";
import { OpenChatProfileEditModal } from "@/components/chat/open-profile/OpenChatProfileEditModal";
import { ChatMessageInput } from "@/components/chat/room/ChatMessageInput";
import { ChatMessageList } from "@/components/chat/room/ChatMessageList";
import { ChatRoomHeader } from "@/components/chat/room/ChatRoomHeader";
import { ChatRoomMenuDrawer } from "@/components/chat/room/menu/ChatRoomMenuDrawer";
import { ChatLanguageSettingsModal } from "@/components/chat/room/modal/ChatLanguageSettingsModal";
import { ChatMemberProfilePreviewModal } from "@/components/chat/room/modal/ChatMemberProfilePreviewModal";
import { ChatPartnerProfilePreviewModal } from "@/components/chat/room/modal/ChatPartnerProfilePreviewModal";
import { ChatRoomInvitationModal } from "@/components/chat/room/modal/ChatRoomInvitationModal";
import { useChatLanguageSettings } from "@/hooks/chat/useChatLanguageSettings";
import { useChatMemberProfilePreview } from "@/hooks/chat/useChatMemberProfilePreview";
import { useChatPartnerProfilePreview } from "@/hooks/chat/useChatPartnerProfilePreview";
import { useChatRoom } from "@/hooks/chat/useChatRoom";
import { useChatRoomInvitation } from "@/hooks/chat/useChatRoomInvitation";
import { useChatRoomMenu } from "@/hooks/chat/useChatRoomMenu";
import { useChatRoomReadStatus } from "@/hooks/chat/useChatRoomReadStatus";
import { useChatRoomRealtime } from "@/hooks/chat/useChatRoomRealtime";
import { useOpenChatMemberProfilePreview } from "@/hooks/chat/useOpenChatMemberProfilePreview";
import { useOpenChatMyProfile } from "@/hooks/chat/useOpenChatMyProfile";
import type {
    OpenChatMemberProfile,
    OpenChatProfileSnapshot,
} from "@/types/chat";
import type {
    OpenChatProfileUpdatedEvent,
    OpenChatRoomClosedEvent,
} from "@/types/chatWebSocket";

interface ChatRoomPageProps {
    roomId: number;
}

export function ChatRoomPage({ roomId }: ChatRoomPageProps) {
    const t = useTranslations("ChatRoom");
    const { data: session } = useSession();
    const [isLanguageSettingsOpen, setIsLanguageSettingsOpen] =
        useState(false);
    const [isOpenProfileEditOpen, setIsOpenProfileEditOpen] =
        useState(false);
    const latestOpenProfileEventAtRef = useRef(new Map<number, number>());

    const partnerProfilePreview = useChatPartnerProfilePreview();
    const memberProfilePreview = useChatMemberProfilePreview({ roomId });
    const openChatMemberProfilePreview =
        useOpenChatMemberProfilePreview(roomId);

    const {
        room,
        messages,
        isLoading,
        isSending: isRestSending,
        isLoadingMore,
        hasNext,
        loadErrorCode,
        sendErrorCode: restSendErrorCode,
        loadMoreErrorCode,
        retryingTranslationKeys,
        retryTranslationErrorKeys,
        reload,
        loadMoreMessages,
        sendMessage: sendRestMessage,
        appendMessage,
        applyTranslationCompleted,
        applyMemberReadUpdated,
        applyOpenChatProfile,
        syncLatestMessages,
        retryTranslation,
    } = useChatRoom(roomId);

    const roomType = room?.roomType ?? null;
    const roomSourceType = room?.sourceType ?? null;
    const isOpenRoom = roomType === "OPEN";

    const {
        settings: languageSettings,
        defaultSettings,
        resolvedSource: languageSettingsSource,
        isLoading: isLanguageSettingsLoading,
        isSaving: isLanguageSettingsSaving,
        loadErrorCode: languageSettingsLoadErrorCode,
        saveErrorCode: languageSettingsSaveErrorCode,
        reload: reloadLanguageSettings,
        saveSettings: saveLanguageSettings,
    } = useChatLanguageSettings(roomId);

    const roomMenu = useChatRoomMenu({
        roomId,
        roomType,
    });

    const openMyProfile = useOpenChatMyProfile({
        roomId,
        enabled: isOpenRoom,
    });

    const applyOpenProfileToMenu = roomMenu.applyOpenChatProfile;
    const reloadRoomMenuMembers = roomMenu.reloadMembers;
    const closeRoomMenu = roomMenu.closeMenu;
    const applyOpenProfileToPreview =
        openChatMemberProfilePreview.applyProfile;
    const retryOpenProfilePreview =
        openChatMemberProfilePreview.retryProfile;
    const openOpenProfilePreview =
        openChatMemberProfilePreview.openProfile;
    const applyOpenMyProfile = openMyProfile.applyProfile;
    const reloadOpenMyProfile = openMyProfile.reload;

    const roomInvitation = useChatRoomInvitation({
        room,
        members: roomMenu.members,
        reloadRoom: reload,
        reloadMembers: roomMenu.reloadMembers,
    });

    const accessToken = session?.accessToken ?? null;
    const currentUserEmail = session?.user?.email ?? null;

    const readStatus = useChatRoomReadStatus({
        roomId,
        messages,
        enabled:
            !isLoading && loadErrorCode === null && room !== null,
    });

    const applyProfileEverywhere = useCallback(
        async (
            profile: OpenChatMemberProfile | OpenChatProfileSnapshot,
        ) => {
            applyOpenChatProfile(profile);
            applyOpenProfileToPreview(profile);
            await Promise.all([
                applyOpenMyProfile(profile),
                applyOpenProfileToMenu(profile),
            ]);
        },
        [
            applyOpenChatProfile,
            applyOpenMyProfile,
            applyOpenProfileToMenu,
            applyOpenProfileToPreview,
        ],
    );

    const handleOpenProfileUpdated = useCallback(
        (event: OpenChatProfileUpdatedEvent) => {
            if (event.roomId !== roomId) {
                return;
            }

            const occurredAt = new Date(event.occurredAt).getTime();
            const previousOccurredAt =
                latestOpenProfileEventAtRef.current.get(
                    event.openChatMemberId,
                ) ?? 0;

            if (
                Number.isFinite(occurredAt) &&
                occurredAt <= previousOccurredAt
            ) {
                return;
            }

            if (Number.isFinite(occurredAt)) {
                latestOpenProfileEventAtRef.current.set(
                    event.openChatMemberId,
                    occurredAt,
                );
            }

            void applyProfileEverywhere({
                openChatMemberId: event.openChatMemberId,
                memberCode: event.memberCode,
                nickname: event.nickname,
                profileImageUrl: event.profileImageUrl,
                role: event.role,
            });
        },
        [applyProfileEverywhere, roomId],
    );

    const handleOpenRoomClosed = useCallback(
        (event: OpenChatRoomClosedEvent) => {
            if (event.roomId !== roomId) {
                return;
            }

            setIsOpenProfileEditOpen(false);
            void reload();
        },
        [reload, roomId],
    );

    const syncAfterReconnect = useCallback(async () => {
        const tasks: Promise<unknown>[] = [syncLatestMessages()];

        if (isOpenRoom) {
            tasks.push(reloadOpenMyProfile());
            tasks.push(reloadRoomMenuMembers());
            tasks.push(retryOpenProfilePreview());
        }

        await Promise.all(tasks);
    }, [
        isOpenRoom,
        reloadOpenMyProfile,
        reloadRoomMenuMembers,
        retryOpenProfilePreview,
        syncLatestMessages,
    ]);

    const realtime = useChatRoomRealtime({
        roomId,
        accessToken,
        isRestSending,
        restSendErrorCode,
        appendMessage,
        applyTranslationCompleted,
        syncLatestMessages: syncAfterReconnect,
        onReadUpdated: readStatus.handleReadUpdated,
        onMemberReadUpdated: applyMemberReadUpdated,
        onOpenChatProfileUpdated: handleOpenProfileUpdated,
        onOpenChatRoomClosed: handleOpenRoomClosed,
        sendRestMessage,
    });

    const sendErrorMessage = realtime.sendErrorCode
        ? t("input.sendFailed")
        : null;
    const loadMoreErrorMessage = loadMoreErrorCode
        ? t("pagination.loadFailed")
        : null;

    const directPartner = room?.directPartner ?? null;
    const canOpenPartnerProfile =
        roomType === "DIRECT" &&
        roomSourceType === "FRIEND" &&
        directPartner !== null;

    const { openProfilePreview: openPartnerProfilePreview } =
        partnerProfilePreview;
    const { openProfile: openGroupMemberProfile } =
        memberProfilePreview;

    const openPartnerProfile = useCallback(() => {
        if (directPartner) {
            openPartnerProfilePreview(directPartner);
        }
    }, [directPartner, openPartnerProfilePreview]);

    const openMessageSenderProfile = useCallback(
        (senderProfileId: number) => {
            if (roomType === "OPEN") {
                void openOpenProfilePreview(senderProfileId);
                return;
            }

            if (roomType === "GROUP") {
                void openGroupMemberProfile(senderProfileId);
                return;
            }

            if (
                canOpenPartnerProfile &&
                directPartner?.userId === senderProfileId
            ) {
                openPartnerProfilePreview(directPartner);
            }
        },
        [
            canOpenPartnerProfile,
            directPartner,
            openGroupMemberProfile,
            openOpenProfilePreview,
            openPartnerProfilePreview,
            roomType,
        ],
    );

    const canOpenMessageSenderProfile =
        roomType === "OPEN" ||
        roomType === "GROUP" ||
        canOpenPartnerProfile;

    const canInviteMembers =
        (roomType === "GROUP" &&
            roomSourceType !== "OPEN" &&
            roomSourceType !== "AI" &&
            (room?.myRole === "OWNER" || room?.myRole === "ADMIN")) ||
        (roomType === "DIRECT" && roomSourceType === "FRIEND");

    const openMemberProfileFromMenu = useCallback(
        (userId: number) => {
            closeRoomMenu();
            void openGroupMemberProfile(userId);
        },
        [closeRoomMenu, openGroupMemberProfile],
    );

    const openOpenMemberProfileFromMenu = useCallback(
        (openChatMemberId: number) => {
            closeRoomMenu();
            void openOpenProfilePreview(openChatMemberId);
        },
        [closeRoomMenu, openOpenProfilePreview],
    );

    const openMyOpenProfile = useCallback(() => {
        closeRoomMenu();
        setIsOpenProfileEditOpen(true);
        if (!openMyProfile.profile) {
            void reloadOpenMyProfile();
        }
    }, [closeRoomMenu, openMyProfile.profile, reloadOpenMyProfile]);

    const handleLocalProfileChanged = useCallback(
        async (profile: OpenChatMemberProfile) => {
            await applyProfileEverywhere(profile);
        },
        [applyProfileEverywhere],
    );

    const reloadAccessState = useCallback(async () => {
        await Promise.all([reload(), reloadOpenMyProfile()]);
    }, [reload, reloadOpenMyProfile]);

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-slate-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("loading")}
            </div>
        );
    }

    if (loadErrorCode || !room) {
        return (
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col items-center justify-center px-4 text-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                    {t("error.title")}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {loadErrorCode
                        ? t("error.loadFailed")
                        : t("error.notFound")}
                </p>
                <button
                    type="button"
                    onClick={() => void reload()}
                    className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    {t("error.retry")}
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-x-0 bottom-0 top-17 flex min-h-0 flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
                <div className="shrink-0">
                    <ChatRoomHeader
                        room={room}
                        connectionStatus={realtime.connectionStatus}
                        languageSettings={languageSettings}
                        isLanguageSettingsLoading={
                            isLanguageSettingsLoading
                        }
                        languageSettingsLoadErrorCode={
                            languageSettingsLoadErrorCode
                        }
                        onOpenLanguageSettings={() =>
                            setIsLanguageSettingsOpen(true)
                        }
                        onOpenPartnerProfile={
                            canOpenPartnerProfile
                                ? openPartnerProfile
                                : undefined
                        }
                        onOpenRoomMenu={roomMenu.openMenu}
                    />
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    <ChatMessageList
                        messages={messages}
                        currentUserEmail={currentUserEmail}
                        currentOpenChatMemberId={
                            openMyProfile.profile?.openChatMemberId ?? null
                        }
                        roomType={roomType}
                        languageSettings={languageSettings}
                        hasNext={hasNext}
                        isLoadingMore={isLoadingMore}
                        loadMoreErrorMessage={loadMoreErrorMessage}
                        retryingTranslationKeys={retryingTranslationKeys}
                        retryTranslationErrorKeys={
                            retryTranslationErrorKeys
                        }
                        onOpenSenderProfile={
                            canOpenMessageSenderProfile
                                ? openMessageSenderProfile
                                : undefined
                        }
                        onLoadMore={loadMoreMessages}
                        onRetryTranslation={retryTranslation}
                        onRefreshMessages={syncLatestMessages}
                    />
                </div>

                <div className="shrink-0">
                    <ChatMessageInput
                        onSend={realtime.sendMessage}
                        isSending={realtime.isSending}
                        sendErrorMessage={sendErrorMessage}
                    />
                </div>
            </div>

            <ChatRoomMenuDrawer
                isOpen={roomMenu.isOpen}
                room={room}
                members={roomMenu.members}
                openMembers={roomMenu.openMembers}
                isLoading={roomMenu.isLoading}
                loadErrorCode={roomMenu.loadErrorCode}
                canInvite={canInviteMembers}
                successCode={roomInvitation.successCode}
                onClose={roomMenu.closeMenu}
                onRetry={roomMenu.reloadMembers}
                onOpenMemberProfile={openMemberProfileFromMenu}
                onOpenOpenMemberProfile={
                    openOpenMemberProfileFromMenu
                }
                canEditMyOpenProfile={
                    isOpenRoom &&
                    room.active &&
                    openMyProfile.profile?.active === true
                }
                onOpenMyOpenProfile={openMyOpenProfile}
                onOpenInvitation={roomInvitation.openInvitation}
                onDismissSuccess={roomInvitation.clearSuccess}
            />

            <ChatRoomInvitationModal
                isOpen={roomInvitation.isOpen}
                room={room}
                friends={roomInvitation.availableFriends}
                selectedFriendUserIds={
                    roomInvitation.selectedFriendUserIds
                }
                publicIdInput={roomInvitation.publicIdInput}
                targetPublicIds={roomInvitation.targetPublicIds}
                groupName={roomInvitation.groupName}
                groupDescription={roomInvitation.groupDescription}
                isFriendLoading={roomInvitation.isFriendLoading}
                isSubmitting={roomInvitation.isSubmitting}
                errorCode={roomInvitation.errorCode}
                onClose={roomInvitation.closeInvitation}
                onToggleFriend={roomInvitation.toggleFriend}
                onUpdatePublicIdInput={
                    roomInvitation.updatePublicIdInput
                }
                onAddPublicId={roomInvitation.addPublicId}
                onRemovePublicId={roomInvitation.removePublicId}
                onUpdateGroupName={roomInvitation.updateGroupName}
                onUpdateGroupDescription={
                    roomInvitation.updateGroupDescription
                }
                onSubmit={roomInvitation.submit}
                onReloadFriends={roomInvitation.reloadFriends}
            />

            <ChatLanguageSettingsModal
                isOpen={isLanguageSettingsOpen}
                settings={languageSettings}
                defaultSettings={defaultSettings}
                resolvedSource={languageSettingsSource}
                isLoading={isLanguageSettingsLoading}
                isSaving={isLanguageSettingsSaving}
                loadErrorCode={languageSettingsLoadErrorCode}
                saveErrorCode={languageSettingsSaveErrorCode}
                onClose={() => setIsLanguageSettingsOpen(false)}
                onSave={saveLanguageSettings}
                onReload={reloadLanguageSettings}
            />

            <ChatPartnerProfilePreviewModal
                isOpen={partnerProfilePreview.isProfilePreviewOpen}
                partner={partnerProfilePreview.previewPartner}
                onClose={partnerProfilePreview.closeProfilePreview}
            />

            <ChatMemberProfilePreviewModal
                isOpen={memberProfilePreview.isOpen}
                profile={memberProfilePreview.profile}
                isLoading={memberProfilePreview.isLoading}
                isSendingFriendRequest={
                    memberProfilePreview.isSendingFriendRequest
                }
                loadErrorCode={memberProfilePreview.loadErrorCode}
                friendRequestErrorCode={
                    memberProfilePreview.friendRequestErrorCode
                }
                onRetry={memberProfilePreview.retryProfile}
                onSendFriendRequest={
                    memberProfilePreview.sendFriendRequest
                }
                onClose={memberProfilePreview.closeProfile}
            />

            <OpenChatMemberProfileModal
                isOpen={openChatMemberProfilePreview.isOpen}
                profile={openChatMemberProfilePreview.profile}
                isLoading={openChatMemberProfilePreview.isLoading}
                loadErrorCode={openChatMemberProfilePreview.loadErrorCode}
                onRetry={openChatMemberProfilePreview.retryProfile}
                onClose={openChatMemberProfilePreview.closeProfile}
            />

            <OpenChatProfileEditModal
                isOpen={isOpenProfileEditOpen}
                roomId={roomId}
                roomActive={room.active}
                profile={openMyProfile.profile}
                isLoading={openMyProfile.isLoading}
                loadErrorCode={openMyProfile.loadErrorCode}
                onRetry={openMyProfile.reload}
                onProfileChanged={handleLocalProfileChanged}
                onAccessStateReload={reloadAccessState}
                onClose={() => setIsOpenProfileEditOpen(false)}
            />
        </>
    );
}
