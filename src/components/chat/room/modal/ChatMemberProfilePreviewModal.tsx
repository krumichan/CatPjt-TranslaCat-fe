"use client";

import { ChatPresenceIndicator } from "@/components/chat/common/ChatPresenceIndicator";
import { ChatMemberFriendRelationAction } from "@/components/chat/room/modal/ChatMemberFriendRelationAction";
import { ChatMemberProfileStateDialog } from "@/components/chat/room/modal/ChatMemberProfileStateDialog";
import UserProfilePreviewModal from "@/components/profile/UserProfilePreviewModal";
import type {
    ChatMemberFriendRequestErrorCode,
    ChatMemberProfileLoadErrorCode,
} from "@/hooks/chat/useChatMemberProfilePreview";
import type { ChatRoomMemberProfile } from "@/types/chat";
import { useTranslations } from "next-intl";

interface ChatMemberProfilePreviewModalProps {
    isOpen: boolean;
    profile: ChatRoomMemberProfile | null;
    isLoading: boolean;
    isSendingFriendRequest: boolean;
    loadErrorCode: ChatMemberProfileLoadErrorCode | null;
    friendRequestErrorCode:
        | ChatMemberFriendRequestErrorCode
        | null;
    onRetry: () => Promise<boolean>;
    onSendFriendRequest: () => Promise<boolean>;
    onClose: () => void;
    showPresence?: boolean;
}

export function ChatMemberProfilePreviewModal({
    isOpen,
    profile,
    isLoading,
    isSendingFriendRequest,
    loadErrorCode,
    friendRequestErrorCode,
    onRetry,
    onSendFriendRequest,
    onClose,
    showPresence = true,
}: ChatMemberProfilePreviewModalProps) {
    const t = useTranslations("ChatRoom.memberProfile");

    if (!isOpen) {
        return null;
    }

    if (isLoading || loadErrorCode || !profile) {
        return (
            <ChatMemberProfileStateDialog
                isLoading={isLoading}
                hasError={loadErrorCode !== null}
                loadingText={t("loading")}
                errorTitle={t("loadFailed")}
                retryLabel={t("retry")}
                closeLabel={t("close")}
                onRetry={onRetry}
                onClose={onClose}
            />
        );
    }

    return (
        <UserProfilePreviewModal
            isOpen={isOpen}
            profile={profile}
            titleId="chat-member-profile-preview-title"
            closeLabel={t("close")}
            profileAlt={t("profileAlt", {
                nickname: profile.displayName,
            })}
            bioLabel={t("bio")}
            emptyBioText={t("emptyBio")}
            isProcessing={isSendingFriendRequest}
            onClose={onClose}
        >
            {showPresence && (
                <div className="mt-4 flex justify-center">
                    <ChatPresenceIndicator
                        online={profile.online}
                        testId="chat-group-member-profile-presence"
                        className="h-3 w-3"
                    />
                </div>
            )}
            <ChatMemberFriendRelationAction
                profile={profile}
                isSending={isSendingFriendRequest}
                errorCode={friendRequestErrorCode}
                onSend={onSendFriendRequest}
            />
        </UserProfilePreviewModal>
    );
}
