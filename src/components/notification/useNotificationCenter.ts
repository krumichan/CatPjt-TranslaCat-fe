"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import type { AccountBookInvitation } from "@/types/accountBook";
import type { FriendRequest } from "@/types/social";
import { accountBookInvitationService } from "@/services/account-book/accountBookInvitationService";
import { friendRequestService } from "@/services/friend/friendRequestService";

export type NotificationTab = "NOTICE" | "INVITATION" | "PERSONAL";
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
        useState<NotificationTab>("INVITATION");

    const [
        processingAccountBookInvitationId,
        setProcessingAccountBookInvitationId,
    ] = useState<number | null>(null);
    const [processingFriendRequestId, setProcessingFriendRequestId] =
        useState<number | null>(null);
    const [processingFriendRequestAction, setProcessingFriendRequestAction] =
        useState<FriendRequestAction | null>(null);

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

    const unreadCount = useMemo(() => {
        return accountBookInvitations.length + receivedFriendRequests.length;
    }, [
        accountBookInvitations.length,
        receivedFriendRequests.length,
    ]);

    const refreshNotifications = async () => {
        await Promise.all([
            mutateAccountBookInvitations((currentData) => currentData, true),
            mutateReceivedFriendRequests((currentData) => currentData, true),
            mutateSentFriendRequests((currentData) => currentData, true),
        ]);
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
        refreshNotifications,

        handleAcceptInvitation,
        handleRejectInvitation,
        handleAcceptFriendRequest,
        handleRejectFriendRequest,
        handleCancelFriendRequest,
    };
}
