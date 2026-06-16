import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import { AccountBookInvitation } from "@/types/accountBook";
import { accountBookInvitationService } from "@/services/account-book/accountBookInvitationService";

export type NotificationTab = "NOTICE" | "INVITATION" | "PERSONAL";

export function useNotificationCenter() {
    const t = useTranslations("Notifications");

    const [activeTab, setActiveTab] =
        useState<NotificationTab>("INVITATION");

    const [processingInvitationId, setProcessingInvitationId] =
        useState<number | null>(null);

    const {
        data: invitations = [],
        isLoading: isInvitationLoading,
        isError: isInvitationError,
        mutate,
    } = useQuery({
        keys: ["received-account-book-invitations"] as const,
        fetcher: () =>
            accountBookInvitationService.listReceivedPendingInvitations(),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            revalidateOnFocus: true,
            refreshInterval: 30000,
            refreshWhenHidden: false,
            refreshWhenOffline: false,
            dedupingInterval: 5000,
        },
    });

    const unreadCount = useMemo(() => {
        return invitations.length;
    }, [invitations.length]);

    const refreshNotifications = async () => {
        await mutate((currentData) => currentData, true);
    };

    const handleAcceptInvitation = async (invitationId: number) => {
        if (processingInvitationId !== null) {
            return;
        }

        try {
            setProcessingInvitationId(invitationId);

            await accountBookInvitationService.acceptInvitation(invitationId);

            await mutate((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (invitation: AccountBookInvitation) =>
                        invitation.id !== invitationId,
                );
            }, false);

            await mutate((currentData) => currentData, true);
        } catch (error) {
            console.error(error);
            window.alert(t("messages.acceptFailed"));
        } finally {
            setProcessingInvitationId(null);
        }
    };

    const handleRejectInvitation = async (invitationId: number) => {
        if (processingInvitationId !== null) {
            return;
        }

        try {
            setProcessingInvitationId(invitationId);

            await accountBookInvitationService.rejectInvitation(invitationId);

            await mutate((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (invitation: AccountBookInvitation) =>
                        invitation.id !== invitationId,
                );
            }, false);

            await mutate((currentData) => currentData, true);
        } catch (error) {
            console.error(error);
            window.alert(t("messages.rejectFailed"));
        } finally {
            setProcessingInvitationId(null);
        }
    };

    return {
        activeTab,
        setActiveTab,

        invitations,
        isInvitationLoading,
        isInvitationError,

        unreadCount,
        processingInvitationId,

        refreshNotifications,

        handleAcceptInvitation,
        handleRejectInvitation,
    };
}