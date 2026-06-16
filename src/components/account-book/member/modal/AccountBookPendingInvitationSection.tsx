import { useTranslations } from "next-intl";

import { AccountBookInvitation } from "@/types/accountBook";
import AccountBookPendingInvitationItem from "@/components/account-book/member/modal/AccountBookPendingInvitationItem";

type AccountBookPendingInvitationSectionProps = {
    invitations: AccountBookInvitation[];
    isLoading: boolean;
    isError: unknown;
    isBusy: boolean;
    cancelingInvitationId: number | null;
    onClickCancel: (invitationId: number) => void;
};

export default function AccountBookPendingInvitationSection({
    invitations,
    isLoading,
    isError,
    isBusy,
    cancelingInvitationId,
    onClickCancel,
}: AccountBookPendingInvitationSectionProps) {
    const t = useTranslations("AccountBook.memberModal");

    return (
        <section className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    {t("pendingInvitations.title")}
                </h3>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm dark:bg-black/20 dark:text-orange-300">
                    {t("pendingInvitations.count", {
                        count: invitations.length,
                    })}
                </span>
            </div>

            {isLoading ? (
                <p className="rounded-xl bg-white/70 px-3 py-3 text-sm text-slate-500 dark:bg-black/20 dark:text-slate-400">
                    {t("messages.loading")}
                </p>
            ) : isError ? (
                <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-500 dark:bg-red-500/10 dark:text-red-300">
                    {t("pendingInvitations.loadFailed")}
                </p>
            ) : invitations.length === 0 ? (
                <p className="rounded-xl bg-white/70 px-3 py-3 text-sm text-slate-500 dark:bg-black/20 dark:text-slate-400">
                    {t("pendingInvitations.empty")}
                </p>
            ) : (
                <div className="space-y-2">
                    {invitations.map((invitation) => (
                        <AccountBookPendingInvitationItem
                            key={invitation.id}
                            invitation={invitation}
                            isBusy={isBusy}
                            isCanceling={cancelingInvitationId === invitation.id}
                            onClickCancel={onClickCancel}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}