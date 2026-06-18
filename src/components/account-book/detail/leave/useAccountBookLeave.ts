import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { accountBookMemberService } from "@/services/account-book/accountBookMemberService";

type UseAccountBookLeaveProps = {
    accountBookId: number;
};

export function useAccountBookLeave({
    accountBookId,
}: UseAccountBookLeaveProps) {
    const t = useTranslations("AccountBook.detail");
    const router = useRouter();

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const openConfirm = () => {
        if (isLeaving) {
            return;
        }

        setIsConfirmOpen(true);
    };

    const closeConfirm = () => {
        if (isLeaving) {
            return;
        }

        setIsConfirmOpen(false);
    };

    const leaveAccountBook = async () => {
        if (isLeaving) {
            return;
        }

        try {
            setIsLeaving(true);

            await accountBookMemberService.leaveAccountBook(accountBookId);

            setIsConfirmOpen(false);

            router.push("/account-books");
            router.refresh();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.leaveFailed"));
        } finally {
            setIsLeaving(false);
        }
    };

    return {
        isConfirmOpen,
        isLeaving,
        openConfirm,
        closeConfirm,
        leaveAccountBook,
    };
}