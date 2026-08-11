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
    processingChatRoomId: number | null;
    onMarkChatAsRead: (item: ChatNotificationChatItem) => void;
    onNavigateChat: () => void;
    chatActivityItems: ChatNotificationActivityItem[];
    chatActivityUnreadCount: number;
    isChatActivityLoading: boolean;
    isChatActivityError: unknown;
    processingActivityId: number | null;
    isProcessingAllActivities: boolean;
    onMarkActivityAsRead: (
        item: ChatNotificationActivityItem,
    ) => Promise<boolean>;
    onMarkAllActivitiesAsRead: () => Promise<boolean>;
    onNavigateActivity: () => void;

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
    processingChatRoomId,
    onMarkChatAsRead,
    onNavigateChat,
    chatActivityItems,
    chatActivityUnreadCount,
    isChatActivityLoading,
    isChatActivityError,
    processingActivityId,
    isProcessingAllActivities,
    onMarkActivityAsRead,
    onMarkAllActivitiesAsRead,
    onNavigateActivity,
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
                processingChatRoomId={processingChatRoomId}
                onMarkRead={onMarkChatAsRead}
                onNavigate={onNavigateChat}
            />
        );
    }

    if (activeTab === "ACTIVITY") {
        return (
            <ChatActivityNotificationPanel
                items={chatActivityItems}
                unreadCount={chatActivityUnreadCount}
                isLoading={isChatActivityLoading}
                error={isChatActivityError}
                processingActivityId={processingActivityId}
                isProcessingAll={isProcessingAllActivities}
                onMarkRead={onMarkActivityAsRead}
                onMarkAllRead={onMarkAllActivitiesAsRead}
                onNavigate={onNavigateActivity}
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
