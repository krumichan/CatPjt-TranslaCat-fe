import { XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { AccountBookInvitation } from "@/types/accountBook";

type AccountBookPendingInvitationItemProps = {
    invitation: AccountBookInvitation;
    isBusy: boolean;
    isCanceling: boolean;
    onClickCancel: (invitationId: number) => void;
};

export default function AccountBookPendingInvitationItem({
    invitation,
    isBusy,
    isCanceling,
    onClickCancel,
}: AccountBookPendingInvitationItemProps) {
    const t = useTranslations("AccountBook.memberModal");

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 shadow-sm dark:bg-black/20">
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                    {invitation.inviteeUsername ||
                        invitation.inviteePublicId}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {invitation.inviteePublicId}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
                    {t(`invitationStatus.${invitation.status}`)}
                </span>

                <button
                    type="button"
                    onClick={() => onClickCancel(invitation.id)}
                    disabled={isBusy}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 ring-1 ring-red-100 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20 dark:hover:bg-red-500/20"
                    aria-label={t("actions.cancelInvitationAria", {
                        name:
                            invitation.inviteeUsername ||
                            invitation.inviteePublicId,
                    })}
                >
                    <XCircle
                        size={16}
                        className={isCanceling ? "animate-pulse" : ""}
                    />
                </button>
            </div>
        </div>
    );
}