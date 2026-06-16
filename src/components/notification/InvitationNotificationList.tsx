import { useTranslations } from "next-intl";

import { AccountBookInvitation } from "@/types/accountBook";
import NotificationEmptyState from "@/components/notification/NotificationEmptyState";
import InvitationNotificationItem from "@/components/notification/InvitationNotificationItem";

type InvitationNotificationListProps = {
    invitations: AccountBookInvitation[];
    isLoading: boolean;
    isError: unknown;
    processingInvitationId: number | null;
    onAccept: (invitationId: number) => void;
    onReject: (invitationId: number) => void;
};

export default function InvitationNotificationList({
    invitations,
    isLoading,
    isError,
    processingInvitationId,
    onAccept,
    onReject,
}: InvitationNotificationListProps) {
    const t = useTranslations("Notifications");

    if (isLoading) {
        return (
            <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-black/25 dark:text-slate-400">
                {t("messages.loading")}
            </p>
        );
    }

    if (isError) {
        return (
            <p className="rounded-2xl bg-red-50 px-4 py-5 text-sm text-red-500 dark:bg-red-500/10 dark:text-red-300">
                {t("messages.loadFailed")}
            </p>
        );
    }

    if (invitations.length === 0) {
        return (
            <NotificationEmptyState
                title={t("invitation.emptyTitle")}
                description={t("invitation.emptyDescription")}
            />
        );
    }

    return (
        <div className="grid gap-3">
            {invitations.map((invitation) => (
                <InvitationNotificationItem
                    key={invitation.id}
                    invitation={invitation}
                    isProcessing={
                        processingInvitationId === invitation.id
                    }
                    isBusy={processingInvitationId !== null}
                    onAccept={onAccept}
                    onReject={onReject}
                />
            ))}
        </div>
    );
}