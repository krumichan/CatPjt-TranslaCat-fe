import ChatActivityNotificationPanel from "@/components/notification/activity/ChatActivityNotificationPanel";
import ChatNotificationPanel from "@/components/notification/chat/ChatNotificationPanel";
import NotificationInvitationPanel from "@/components/notification/NotificationInvitationPanel";
import type {
    FriendRequestAction,
    NotificationTab,
} from "@/components/notification/useNotificationCenter";
import type { AccountBookInvitation } from "@/types/accountBook";
import type {
    ChatNotificationActivityItem,
    ChatNotificationChatItem,
} from "@/types/chatNotification";
import type { FriendRequest } from "@/types/social";

type NotificationCenterContentProps = {
    activeTab: NotificationTab;

    chatNotificationItems: ChatNotificationChatItem[];
    isChatNotificationLoading: boolean;
    isChatNotificationError: unknown;
    chatActivityItems: ChatNotificationActivityItem[];
    isChatActivityLoading: boolean;
    isChatActivityError: unknown;

    accountBookInvitations: AccountBookInvitation[];
    isAccountBookInvitationLoading: boolean;
    isAccountBookInvitationError: unknown;
    processingAccountBookInvitationId: number | null;
    onAcceptAccountBookInvitation: (invitationId: number) => void;
    onRejectAccountBookInvitation: (invitationId: number) => void;

    receivedFriendRequests: FriendRequest[];
    sentFriendRequests: FriendRequest[];
    isReceivedFriendRequestLoading: boolean;
    isReceivedFriendRequestError: unknown;
    isSentFriendRequestLoading: boolean;
    isSentFriendRequestError: unknown;
    processingFriendRequestId: number | null;
    processingFriendRequestAction: FriendRequestAction | null;
    onAcceptFriendRequest: (requestId: number) => void;
    onRejectFriendRequest: (requestId: number) => void;
    onCancelFriendRequest: (requestId: number) => void;
};

export default function NotificationCenterContent({
    activeTab,
    chatNotificationItems,
    isChatNotificationLoading,
    isChatNotificationError,
    chatActivityItems,
    isChatActivityLoading,
    isChatActivityError,
    accountBookInvitations,
    isAccountBookInvitationLoading,
    isAccountBookInvitationError,
    processingAccountBookInvitationId,
    onAcceptAccountBookInvitation,
    onRejectAccountBookInvitation,
    receivedFriendRequests,
    sentFriendRequests,
    isReceivedFriendRequestLoading,
    isReceivedFriendRequestError,
    isSentFriendRequestLoading,
    isSentFriendRequestError,
    processingFriendRequestId,
    processingFriendRequestAction,
    onAcceptFriendRequest,
    onRejectFriendRequest,
    onCancelFriendRequest,
}: NotificationCenterContentProps) {
    if (activeTab === "CHAT") {
        return (
            <ChatNotificationPanel
                items={chatNotificationItems}
                isLoading={isChatNotificationLoading}
                error={isChatNotificationError}
            />
        );
    }

    if (activeTab === "ACTIVITY") {
        return (
            <ChatActivityNotificationPanel
                items={chatActivityItems}
                isLoading={isChatActivityLoading}
                error={isChatActivityError}
            />
        );
    }

    return (
        <NotificationInvitationPanel
            accountBookInvitations={accountBookInvitations}
            isAccountBookInvitationLoading={isAccountBookInvitationLoading}
            isAccountBookInvitationError={isAccountBookInvitationError}
            processingAccountBookInvitationId={processingAccountBookInvitationId}
            onAcceptAccountBookInvitation={onAcceptAccountBookInvitation}
            onRejectAccountBookInvitation={onRejectAccountBookInvitation}
            receivedFriendRequests={receivedFriendRequests}
            sentFriendRequests={sentFriendRequests}
            isReceivedFriendRequestLoading={isReceivedFriendRequestLoading}
            isReceivedFriendRequestError={isReceivedFriendRequestError}
            isSentFriendRequestLoading={isSentFriendRequestLoading}
            isSentFriendRequestError={isSentFriendRequestError}
            processingFriendRequestId={processingFriendRequestId}
            processingFriendRequestAction={processingFriendRequestAction}
            onAcceptFriendRequest={onAcceptFriendRequest}
            onRejectFriendRequest={onRejectFriendRequest}
            onCancelFriendRequest={onCancelFriendRequest}
        />
    );
}
