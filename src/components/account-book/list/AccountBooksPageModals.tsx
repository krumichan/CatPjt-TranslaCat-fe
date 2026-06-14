import { useTranslations } from "next-intl";
import {
    AccountBook,
    AccountBookEditFormValues,
    CreateAccountBookFormValues,
    Currency,
} from "@/types/accountBook";
import AccountBookCreateModal from "@/components/account-book/modal/AccountBookCreateModal";
import AccountBookEditModal from "@/components/account-book/modal/AccountBookEditModal";
import AccountBookMemberManageModal from "@/components/account-book/member/modal/AccountBookMemberManageModal";
import ConfirmModal from "@/components/common/ConfirmModal";

type AccountBooksPageModalsProps = {
    isCreateModalOpen: boolean;
    editingAccountBook: AccountBook | null;
    deleteTargetAccountBook: AccountBook | null;
    memberTargetAccountBook: AccountBook | null;
    categoryOptions: string[];
    currencies: Currency[];
    isCurrencyLoading: boolean;
    isDeleting: boolean;
    onCloseCreateModal: () => void;
    onCloseEditModal: () => void;
    onCloseDeleteConfirm: () => void;
    onCloseMemberModal: () => void;
    onCreateAccountBook: (
        values: CreateAccountBookFormValues
    ) => void | Promise<void>;
    onUpdateAccountBook: (
        accountBookId: number,
        values: AccountBookEditFormValues
    ) => void | Promise<void>;
    onConfirmDelete: () => void | Promise<void>;
};

export default function AccountBooksPageModals({
    isCreateModalOpen,
    editingAccountBook,
    deleteTargetAccountBook,
    memberTargetAccountBook,
    categoryOptions,
    currencies,
    isCurrencyLoading,
    isDeleting,
    onCloseCreateModal,
    onCloseEditModal,
    onCloseDeleteConfirm,
    onCloseMemberModal,
    onCreateAccountBook,
    onUpdateAccountBook,
    onConfirmDelete,
}: AccountBooksPageModalsProps) {
    const t = useTranslations("AccountBook");

    return (
        <>
            <AccountBookCreateModal
                isOpen={isCreateModalOpen}
                categoryOptions={categoryOptions}
                currencies={currencies}
                isCurrencyLoading={isCurrencyLoading}
                onClose={onCloseCreateModal}
                onSubmit={onCreateAccountBook}
            />

            <AccountBookEditModal
                isOpen={editingAccountBook !== null}
                accountBook={editingAccountBook}
                categoryOptions={categoryOptions}
                onClose={onCloseEditModal}
                onSubmit={onUpdateAccountBook}
            />

            {memberTargetAccountBook && (
                <AccountBookMemberManageModal
                    accountBookId={memberTargetAccountBook.id}
                    accountBookName={memberTargetAccountBook.name}
                    onClose={onCloseMemberModal}
                />
            )}

            <ConfirmModal
                isOpen={deleteTargetAccountBook !== null}
                title={t("deleteConfirmModal.title")}
                description={t("deleteConfirmModal.description", {
                    name: deleteTargetAccountBook?.name ?? "",
                })}
                confirmLabel={
                    isDeleting
                        ? t("deleteConfirmModal.deleting")
                        : t("deleteConfirmModal.confirm")
                }
                cancelLabel={t("deleteConfirmModal.cancel")}
                variant="danger"
                isLoading={isDeleting}
                onClose={onCloseDeleteConfirm}
                onConfirm={onConfirmDelete}
            />
        </>
    );
}
