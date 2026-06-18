import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import { AccountBookMemberRole } from "@/types/accountBook";
import { canLeaveAccountBook } from "@/utils/account-book/accountBookPermission";
import { useAccountBookLeave } from "@/components/account-book/detail/leave/useAccountBookLeave";

type AccountBookLeaveSmartActionProps = {
    accountBookId: number;
    accountBookName: string;
    myRole?: AccountBookMemberRole | null;
};

export default function AccountBookLeaveSmartAction({
    accountBookId,
    accountBookName,
    myRole,
}: AccountBookLeaveSmartActionProps) {
    const t = useTranslations("AccountBook.detail");

    const leave = useAccountBookLeave({
        accountBookId,
    });

    const canLeave = canLeaveAccountBook({
        myRole,
    });

    if (!canLeave) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={leave.openConfirm}
                disabled={leave.isLeaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-500 shadow-sm transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
            >
                <LogOut size={18} />
                {t("header.leaveAccountBook")}
            </button>

            <ConfirmModal
                isOpen={leave.isConfirmOpen}
                title={t("leaveConfirm.title")}
                description={t("leaveConfirm.description", {
                    name: accountBookName,
                })}
                confirmLabel={t("leaveConfirm.confirm")}
                variant="danger"
                isLoading={leave.isLeaving}
                closeOnBackdrop={!leave.isLeaving}
                onClose={leave.closeConfirm}
                onConfirm={leave.leaveAccountBook}
            />
        </>
    );
}