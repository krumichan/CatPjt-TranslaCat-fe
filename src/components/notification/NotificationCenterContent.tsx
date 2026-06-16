import { useTranslations } from "next-intl";

import { AccountBookInvitation } from "@/types/accountBook";
import { NotificationTab } from "@/components/notification/useNotificationCenter";
import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import InvitationNotificationList from "@/components/notification/InvitationNotificationList";

type NotificationCenterContentProps = {
    activeTab: NotificationTab;
    invitations: AccountBookInvitation[];
    isInvitationLoading: boolean;
    isInvitationError: unknown;
    processingInvitationId: number | null;
    onAcceptInvitation: (invitationId: number) => void;
    onRejectInvitation: (invitationId: number) => void;
};

export default function NotificationCenterContent({
    activeTab,
    invitations,
    isInvitationLoading,
    isInvitationError,
    processingInvitationId,
    onAcceptInvitation,
    onRejectInvitation,
}: NotificationCenterContentProps) {
    const t = useTranslations("Notifications");

    if (activeTab === "NOTICE") {
        return (
            <NotificationEmptyState
                title={t("notice.emptyTitle")}
                description={t("notice.emptyDescription")}
            />
        );
    }

    if (activeTab === "PERSONAL") {
        return (
            <NotificationEmptyState
                title={t("personal.emptyTitle")}
                description={t("personal.emptyDescription")}
            />
        );
    }

    return (
        <InvitationNotificationList
            invitations={invitations}
            isLoading={isInvitationLoading}
            isError={isInvitationError}
            processingInvitationId={processingInvitationId}
            onAccept={onAcceptInvitation}
            onReject={onRejectInvitation}
        />
    );
}