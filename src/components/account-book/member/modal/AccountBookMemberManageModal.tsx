import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import AccountBookMemberInviteForm from "@/components/account-book/member/modal/AccountBookMemberInviteForm";
import AccountBookMemberListSection from "@/components/account-book/member/modal/AccountBookMemberListSection";
import AccountBookPendingInvitationSection from "@/components/account-book/member/modal/AccountBookPendingInvitationSection";
import { useAccountBookMemberManageModal } from "@/components/account-book/member/modal/useAccountBookMemberManageModal";

type AccountBookMemberManageModalProps = {
    accountBookId: number;
    accountBookName?: string;
    onClose: () => void;
};

export default function AccountBookMemberManageModal({
    accountBookId,
    accountBookName,
    onClose,
}: AccountBookMemberManageModalProps) {
    const t = useTranslations("AccountBook.memberModal");

    const modal = useAccountBookMemberManageModal({
        accountBookId,
        onClose,
    });

    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <>
            <div className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm" />

            <div className="fixed inset-0 z-101 flex items-start justify-center overflow-hidden px-3 py-4 sm:px-4 sm:py-10">
                <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/10 sm:p-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                                {t("eyebrow")}
                            </p>

                            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                                {t("title")}
                            </h2>

                            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                {accountBookName
                                    ? t("descriptionWithName", {
                                        name: accountBookName,
                                    })
                                    : t("description")}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={modal.handleClose}
                            disabled={modal.isBusy}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label={t("actions.close")}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                        <div className="space-y-6">
                            <AccountBookMemberInviteForm
                                publicId={modal.publicId}
                                isInviting={modal.isInviting}
                                isBusy={modal.isBusy}
                                canInvite={modal.canInvite}
                                onPublicIdChange={modal.setPublicId}
                                onInvite={modal.handleInvite}
                            />

                            <AccountBookMemberListSection
                                members={modal.members}
                                isLoading={modal.isMemberLoading}
                                isError={modal.isMemberError}
                                isBusy={modal.isBusy}
                                onClickRemove={modal.setRemovingMember}
                            />

                            <AccountBookPendingInvitationSection
                                invitations={modal.pendingInvitations}
                                isLoading={modal.isInvitationLoading}
                                isError={modal.isInvitationError}
                                isBusy={modal.isBusy}
                                cancelingInvitationId={modal.cancelingInvitationId}
                                onClickCancel={modal.handleCancelInvitation}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!modal.removingMember}
                title={t("removeConfirm.title")}
                description={
                    modal.removingMember
                        ? t("removeConfirm.description", {
                            name:
                                modal.removingMember.username ||
                                modal.removingMember.publicId,
                        })
                        : undefined
                }
                confirmLabel={t("actions.remove")}
                variant="danger"
                isLoading={modal.isRemoving}
                closeOnBackdrop={!modal.isRemoving}
                onClose={modal.handleCloseRemoveConfirm}
                onConfirm={modal.handleRemoveMember}
            />
        </>,
        document.body,
    );
}