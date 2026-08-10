"use client";

import { ChatAiManagementSmartModal } from "@/components/chat/ai/ChatAiManagementSmartModal";
import { ChatAiMemberProfileModal } from "@/components/chat/ai/ChatAiMemberProfileModal";
import { OpenChatBlacklistSmartModal } from "@/components/chat/open-blacklist/OpenChatBlacklistSmartModal";
import { OpenChatMemberModerationActions } from "@/components/chat/open-moderation/OpenChatMemberModerationActions";
import { OpenChatModerationDialog } from "@/components/chat/open-moderation/OpenChatModerationDialog";
import { OpenChatMemberProfileModal } from "@/components/chat/open-profile/OpenChatMemberProfileModal";
import { OpenChatProfileEditModal } from "@/components/chat/open-profile/OpenChatProfileEditModal";
import { ChatRoomMenuDrawer } from "@/components/chat/room/menu/ChatRoomMenuDrawer";
import { ChatLanguageSettingsModal } from "@/components/chat/room/modal/ChatLanguageSettingsModal";
import { ChatMemberProfilePreviewModal } from "@/components/chat/room/modal/ChatMemberProfilePreviewModal";
import { ChatPartnerProfilePreviewModal } from "@/components/chat/room/modal/ChatPartnerProfilePreviewModal";
import { ChatRoomInvitationModal } from "@/components/chat/room/modal/ChatRoomInvitationModal";
import { OpenChatLifecycleDialog } from "@/components/chat/room/modal/OpenChatLifecycleDialog";
import type { ChatRoomPageController } from "@/hooks/chat/useChatRoomPageController";
import type { ChatRoom } from "@/types/chat";
import { getOpenChatModerationActions } from "@/utils/chat/openChatModeration";

interface ChatRoomPageOverlaysProps {
    room: ChatRoom;
    controller: ChatRoomPageController;
}

export function ChatRoomPageOverlays({
    room,
    controller,
}: ChatRoomPageOverlaysProps) {
    const {
        roomId,
        isOpenRoom,
        roomMenu,
        roomInvitation,
        languageSettings,
        partnerProfilePreview,
        memberProfilePreview,
        openMemberProfilePreview,
        aiMemberProfilePreview,
        openLifecycle,
        openChat,
    } = controller;

    const moderationActions = openMemberProfilePreview.profile
        ? getOpenChatModerationActions({
              actorRole: room.myRole,
              actorOpenChatMemberId:
                  openChat.myProfile.profile?.openChatMemberId,
              target: openMemberProfilePreview.profile,
          })
        : [];

    return (
        <>
            <ChatRoomMenuDrawer
                isOpen={roomMenu.isOpen}
                room={room}
                members={roomMenu.members}
                openMembers={roomMenu.openMembers}
                aiMembers={roomMenu.aiMembers}
                aiDisclosureType={roomMenu.aiDisclosureType}
                isLoading={roomMenu.isLoading}
                loadErrorCode={roomMenu.loadErrorCode}
                canInvite={controller.canInviteMembers}
                successCode={roomInvitation.successCode}
                onClose={roomMenu.closeMenu}
                onRetry={roomMenu.reloadMembers}
                onOpenMemberProfile={
                    controller.openMemberProfileFromMenu
                }
                onOpenOpenMemberProfile={
                    controller.openOpenMemberProfileFromMenu
                }
                onOpenAiMemberProfile={
                    controller.openAiMessageSenderProfile
                }
                canEditMyOpenProfile={
                    isOpenRoom &&
                    room.active &&
                    openChat.myProfile.profile?.active === true
                }
                onOpenMyOpenProfile={openChat.openMyProfileEditor}
                currentOpenChatMemberId={
                    openChat.myProfile.profile?.openChatMemberId ?? null
                }
                canManageOpenChat={controller.canManageOpenChat}
                canViewAiSettings={controller.canViewAiSettings}
                canManageAi={controller.canManageAi}
                onOpenAiSettings={controller.openAiSettings}
                onOpenBlacklist={controller.blacklist.open}
                onOpenModerationAction={openChat.moderation.open}
                openLifecycleAction={openLifecycle.action}
                onOpenLifecycle={openLifecycle.openActionDialog}
                onOpenInvitation={roomInvitation.openInvitation}
                onDismissSuccess={roomInvitation.clearSuccess}
            />


            <ChatAiManagementSmartModal
                isOpen={controller.isAiSettingsOpen}
                roomId={roomId}
                roomType={room.roomType}
                canManage={controller.canManageAi}
                onClose={controller.closeAiSettings}
            />

            <ChatAiMemberProfileModal
                isOpen={aiMemberProfilePreview.isOpen}
                profile={aiMemberProfilePreview.profile}
                disclosureType={
                    controller.aiDisplayPolicy.setting?.disclosureType ??
                    roomMenu.aiDisclosureType ??
                    null
                }
                isLoading={aiMemberProfilePreview.isLoading}
                loadErrorCode={aiMemberProfilePreview.loadErrorCode}
                onRetry={aiMemberProfilePreview.retryProfile}
                onClose={aiMemberProfilePreview.closeProfile}
            />

            <OpenChatBlacklistSmartModal
                isOpen={controller.blacklist.isOpen}
                roomId={roomId}
                roomName={room.name || `#${roomId}`}
                onClose={controller.blacklist.close}
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
                onUpdatePublicIdInput={roomInvitation.updatePublicIdInput}
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
                isOpen={controller.isLanguageSettingsOpen}
                settings={languageSettings.settings}
                defaultSettings={languageSettings.defaultSettings}
                resolvedSource={languageSettings.resolvedSource}
                isLoading={languageSettings.isLoading}
                isSaving={languageSettings.isSaving}
                loadErrorCode={languageSettings.loadErrorCode}
                saveErrorCode={languageSettings.saveErrorCode}
                onClose={controller.closeLanguageSettings}
                onSave={languageSettings.saveSettings}
                onReload={languageSettings.reload}
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
                showPresence={roomMenu.aiDisclosureType !== "PRIVATE"}
                onRetry={memberProfilePreview.retryProfile}
                onSendFriendRequest={
                    memberProfilePreview.sendFriendRequest
                }
                onClose={memberProfilePreview.closeProfile}
            />

            <OpenChatMemberProfileModal
                isOpen={openMemberProfilePreview.isOpen}
                profile={openMemberProfilePreview.profile}
                isLoading={openMemberProfilePreview.isLoading}
                loadErrorCode={openMemberProfilePreview.loadErrorCode}
                showPresence={roomMenu.aiDisclosureType !== "PRIVATE"}
                actionSlot={
                    openMemberProfilePreview.profile ? (
                        <OpenChatMemberModerationActions
                            target={openMemberProfilePreview.profile}
                            actions={moderationActions}
                            variant="panel"
                            onAction={(action, target) => {
                                openMemberProfilePreview.closeProfile();
                                openChat.moderation.open(action, target);
                            }}
                        />
                    ) : null
                }
                onRetry={openMemberProfilePreview.retryProfile}
                onClose={openMemberProfilePreview.closeProfile}
            />

            <OpenChatProfileEditModal
                isOpen={openChat.isProfileEditOpen}
                roomId={roomId}
                roomActive={room.active}
                profile={openChat.myProfile.profile}
                isLoading={openChat.myProfile.isLoading}
                loadErrorCode={openChat.myProfile.loadErrorCode}
                onRetry={openChat.myProfile.reload}
                onProfileChanged={openChat.handleLocalProfileChanged}
                onAccessStateReload={openChat.reloadAccessState}
                onClose={openChat.closeMyProfileEditor}
            />

            <OpenChatModerationDialog
                action={openChat.moderation.action}
                target={openChat.moderation.target}
                reason={openChat.moderation.reason}
                isSubmitting={openChat.moderation.isSubmitting}
                errorCode={openChat.moderation.errorCode}
                onReasonChange={openChat.moderation.updateReason}
                onClose={openChat.moderation.close}
                onSubmit={openChat.moderation.submit}
            />

            <OpenChatLifecycleDialog
                mode={openLifecycle.dialogMode}
                candidates={openLifecycle.candidates}
                selectedTargetId={openLifecycle.selectedTargetId}
                isSubmitting={openLifecycle.isSubmitting}
                errorCode={openLifecycle.errorCode}
                onClose={openLifecycle.closeDialog}
                onSelectTarget={openLifecycle.selectTarget}
                onSubmit={openLifecycle.submit}
                onAcknowledgeClosed={openLifecycle.acknowledgeClosed}
            />
        </>
    );
}
