import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { AccountBookInvitation } from "@/types/accountBook";

type InvitationNotificationItemProps = {
    invitation: AccountBookInvitation;
    isProcessing: boolean;
    isBusy: boolean;
    onAccept: (invitationId: number) => void;
    onReject: (invitationId: number) => void;
};

export default function InvitationNotificationItem({
    invitation,
    isProcessing,
    isBusy,
    onAccept,
    onReject,
}: InvitationNotificationItemProps) {
    const t = useTranslations("Notifications");

    return (
        <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/25">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {t("invitation.accountBookInviteTitle")}
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {t("invitation.accountBookInviteDescription", {
                            accountBookName: invitation.accountBookName,
                            inviterName:
                                invitation.inviterUsername ||
                                invitation.inviterPublicId,
                        })}
                    </p>
                </div>

                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={() => onReject(invitation.id)}
                        disabled={isBusy}
                        className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                    >
                        <X size={16} />
                        {t("actions.reject")}
                    </button>

                    <button
                        type="button"
                        onClick={() => onAccept(invitation.id)}
                        disabled={isBusy}
                        className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                    >
                        <Check
                            size={16}
                            className={isProcessing ? "animate-pulse" : ""}
                        />
                        {t("actions.accept")}
                    </button>
                </div>
            </div>
        </article>
    );
}