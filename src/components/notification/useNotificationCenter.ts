"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import { useChatNotifications } from "@/hooks/chat/useChatNotifications";
import { useSupportNotifications } from "@/hooks/support/useSupportNotifications";
import type { AccountBookInvitation } from "@/types/accountBook";
import type { FriendRequest } from "@/types/social";
import type {
    ChatNotificationActivityItem,
    ChatNotificationChatItem,
} from "@/types/chatNotification";
import { accountBookInvitationService } from "@/services/account-book/accountBookInvitationService";
import { friendRequestService } from "@/services/friend/friendRequestService";

export type NotificationTab = "CHAT" | "ACTIVITY" | "INVITATION";
export type FriendRequestAction = "ACCEPT" | "REJECT" | "CANCEL";

const NOTIFICATION_QUERY_CONFIG = {
    revalidateOnMount: true,
    revalidateIfStale: true,
    revalidateOnFocus: true,
    refreshInterval: 30000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    dedupingInterval: 5000,
};

export function useNotificationCenter() {
    const t = useTranslations("Notifications");
    const [activeTab, setActiveTab] =
        useState<NotificationTab>("CHAT");

    const [
        processingAccountBookInvitationId,
        setProcessingAccountBookInvitationId,
    ] = useState<number | null>(null);
    const [processingFriendRequestId, setProcessingFriendRequestId] =
        useState<number | null>(null);
    const [processingFriendRequestAction, setProcessingFriendRequestAction] =
        useState<FriendRequestAction | null>(null);

    const chatNotification = useChatNotifications();
    const supportNotification = useSupportNotifications();

    const {
        data: accountBookInvitations = [],
        isLoading: isAccountBookInvitationLoading,
        isError: isAccountBookInvitationError,
        mutate: mutateAccountBookInvitations,
    } = useQuery({
        keys: ["received-account-book-invitations"] as const,
        fetcher: () =>
            accountBookInvitationService.listReceivedPendingInvitations(),
        config: NOTIFICATION_QUERY_CONFIG,
    });

    const {
        data: receivedFriendRequests = [],
        isLoading: isReceivedFriendRequestLoading,
        isError: isReceivedFriendRequestError,
        mutate: mutateReceivedFriendRequests,
    } = useQuery({
        keys: ["received-friend-requests"] as const,
        fetcher: () => friendRequestService.getReceivedPendingRequests(),
        config: NOTIFICATION_QUERY_CONFIG,
    });

    const {
        data: sentFriendRequests = [],
        isLoading: isSentFriendRequestLoading,
        isError: isSentFriendRequestError,
        mutate: mutateSentFriendRequests,
    } = useQuery({
        keys: ["sent-friend-requests"] as const,
        fetcher: () => friendRequestService.getSentPendingRequests(),
        config: NOTIFICATION_QUERY_CONFIG,
    });

    const invitationUnreadCount = useMemo(() => {
        return accountBookInvitations.length + receivedFriendRequests.length;
    }, [
        accountBookInvitations.length,
        receivedFriendRequests.length,
    ]);

    const unreadCount =
        invitationUnreadCount +
        chatNotification.summary.totalAttentionCount +
        supportNotification.unreadCount;

    const tabCounts = {
        CHAT: chatNotification.summary.unreadChatMessageCount,
        ACTIVITY:
            chatNotification.summary.unreadActivityCount +
            supportNotification.unreadCount,
        INVITATION: invitationUnreadCount,
    } satisfies Record<NotificationTab, number>;

    const refreshNotifications = async () => {
        // 일부 출처의 조회가 실패해도 나머지 알림을 표시하고 각 패널에서 오류를 안내한다.
        await Promise.allSettled([
            mutateAccountBookInvitations((currentData) => currentData, true),
            mutateReceivedFriendRequests((currentData) => currentData, true),
            mutateSentFriendRequests((currentData) => currentData, true),
            chatNotification.refresh(),
            supportNotification.refresh(),
        ]);
    };

    const handleMarkChatAsRead = async (item: ChatNotificationChatItem) => {
        const succeeded = await chatNotification.markChatRoomAsRead(item);

        if (!succeeded) {
            window.alert(t("chat.markReadFailed"));
        }
    };

    const handleMarkActivityAsRead = async (
        item: ChatNotificationActivityItem,
    ): Promise<boolean> => {
        const succeeded = await chatNotification.markActivityAsRead(item);

        if (!succeeded) {
            window.alert(t("activity.markReadFailed"));
        }

        return succeeded;
    };

    const handleMarkAllActivitiesAsRead = async (): Promise<boolean> => {
        // 활동 탭의 모든 출처를 각각 저장하고, 한쪽 실패가 다른 결과를 숨기지 않게 한다.
        const results = await Promise.all([
            chatNotification.markAllActivitiesAsRead(),
            supportNotification.unreadCount > 0
                ? supportNotification.markAllAsRead()
                : Promise.resolve(true),
        ]);
        const succeeded = results.every(Boolean);

        if (!succeeded) {
            window.alert(t("activity.markAllReadFailed"));
        }

        return succeeded;
    };

    const handleAcceptInvitation = async (invitationId: number) => {
        if (processingAccountBookInvitationId !== null) {
            return;
        }

        try {
            setProcessingAccountBookInvitationId(invitationId);
            await accountBookInvitationService.acceptInvitation(invitationId);

            await mutateAccountBookInvitations((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (invitation: AccountBookInvitation) =>
                        invitation.id !== invitationId,
                );
            }, false);
            await mutateAccountBookInvitations(
                (currentData) => currentData,
                true,
            );
        } catch (error) {
            console.error(error);
            window.alert(t("messages.acceptFailed"));
        } finally {
            setProcessingAccountBookInvitationId(null);
        }
    };

    const handleRejectInvitation = async (invitationId: number) => {
        if (processingAccountBookInvitationId !== null) {
            return;
        }

        try {
            setProcessingAccountBookInvitationId(invitationId);
            await accountBookInvitationService.rejectInvitation(invitationId);

            await mutateAccountBookInvitations((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (invitation: AccountBookInvitation) =>
                        invitation.id !== invitationId,
                );
            }, false);
            await mutateAccountBookInvitations(
                (currentData) => currentData,
                true,
            );
        } catch (error) {
            console.error(error);
            window.alert(t("messages.rejectFailed"));
        } finally {
            setProcessingAccountBookInvitationId(null);
        }
    };

    const handleAcceptFriendRequest = async (requestId: number) => {
        if (processingFriendRequestId !== null) {
            return;
        }

        try {
            setProcessingFriendRequestId(requestId);
            setProcessingFriendRequestAction("ACCEPT");

            await friendRequestService.acceptFriendRequest(requestId);

            await mutateReceivedFriendRequests((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (request: FriendRequest) => request.id !== requestId,
                );
            }, false);
            await mutateReceivedFriendRequests(
                (currentData) => currentData,
                true,
            );
        } catch (error) {
            console.error(error);
            window.alert(t("messages.acceptFriendRequestFailed"));
        } finally {
            setProcessingFriendRequestId(null);
            setProcessingFriendRequestAction(null);
        }
    };

    const handleRejectFriendRequest = async (requestId: number) => {
        if (processingFriendRequestId !== null) {
            return;
        }

        try {
            setProcessingFriendRequestId(requestId);
            setProcessingFriendRequestAction("REJECT");

            await friendRequestService.rejectFriendRequest(requestId);

            await mutateReceivedFriendRequests((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (request: FriendRequest) => request.id !== requestId,
                );
            }, false);
            await mutateReceivedFriendRequests(
                (currentData) => currentData,
                true,
            );
        } catch (error) {
            console.error(error);
            window.alert(t("messages.rejectFriendRequestFailed"));
        } finally {
            setProcessingFriendRequestId(null);
            setProcessingFriendRequestAction(null);
        }
    };

    const handleCancelFriendRequest = async (requestId: number) => {
        if (processingFriendRequestId !== null) {
            return;
        }

        try {
            setProcessingFriendRequestId(requestId);
            setProcessingFriendRequestAction("CANCEL");

            await friendRequestService.cancelFriendRequest(requestId);

            await mutateSentFriendRequests((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (request: FriendRequest) => request.id !== requestId,
                );
            }, false);
            await mutateSentFriendRequests(
                (currentData) => currentData,
                true,
            );
        } catch (error) {
            console.error(error);
            window.alert(t("messages.cancelFriendRequestFailed"));
        } finally {
            setProcessingFriendRequestId(null);
            setProcessingFriendRequestAction(null);
        }
    };

    return {
        activeTab,
        setActiveTab,

        invitations: accountBookInvitations,
        accountBookInvitations,
        isInvitationLoading: isAccountBookInvitationLoading,
        isInvitationError: isAccountBookInvitationError,
        isAccountBookInvitationLoading,
        isAccountBookInvitationError,
        processingInvitationId: processingAccountBookInvitationId,
        processingAccountBookInvitationId,

        receivedFriendRequests,
        sentFriendRequests,
        isReceivedFriendRequestLoading,
        isReceivedFriendRequestError,
        isSentFriendRequestLoading,
        isSentFriendRequestError,
        processingFriendRequestId,
        processingFriendRequestAction,

        unreadCount,
        tabCounts,
        chatNotificationSummary: chatNotification.summary,
        chatNotificationItems: chatNotification.chatList.items,
        chatActivityItems: chatNotification.activityList.items,
        supportNotification,
        isChatNotificationLoading: chatNotification.isChatListLoading,
        isChatNotificationError: chatNotification.chatListError,
        isChatActivityLoading: chatNotification.isActivityListLoading,
        isChatActivityError: chatNotification.activityListError,
        processingChatRoomId: chatNotification.processingChatRoomId,
        processingActivityId: chatNotification.processingActivityId,
        isProcessingAllActivities:
            chatNotification.isProcessingAllActivities,
        refreshNotifications,
        handleMarkChatAsRead,
        handleMarkActivityAsRead,
        handleMarkAllActivitiesAsRead,

        handleAcceptInvitation,
        handleRejectInvitation,
        handleAcceptFriendRequest,
        handleRejectFriendRequest,
        handleCancelFriendRequest,
    };
}
