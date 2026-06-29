"use client";

import { useTranslations } from "next-intl";

import InvitationNotificationItem from "@/components/notification/InvitationNotificationItem";
import type { AccountBookInvitation } from "@/types/accountBook";

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

    if (isLoading && invitations.length === 0) {
        return (
            <div className="rounded-2xl bg-black/20 px-4 py-5 text-center text-sm font-bold text-slate-400">
                {t("messages.loading")}
            </div>
        );
    }

    if (isError && invitations.length === 0) {
        return (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-5 text-center text-sm font-bold text-rose-200">
                {t("messages.loadFailed")}
            </div>
        );
    }

    if (invitations.length === 0) {
        return (
            <div className="rounded-2xl bg-black/20 px-4 py-5 text-center text-sm text-slate-400">
                {t("accountBookInvitation.empty")}
            </div>
        );
    }

    return (
        <div className="space-y-3">
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
