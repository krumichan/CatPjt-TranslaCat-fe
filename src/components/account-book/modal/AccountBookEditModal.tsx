import { createPortal } from "react-dom";
import {
    AccountBook,
    AccountBookEditFormValues,
} from "@/types/accountBook";
import {AccountBookEditModalContent} from "@/components/account-book/modal/AccountBookEditModalContent";

type AccountBookEditModalProps = {
    isOpen: boolean;
    accountBook: AccountBook | null;
    categoryOptions: string[];
    onClose: () => void;
    onSubmit: (
        accountBookId: number,
        request: AccountBookEditFormValues
    ) => void | Promise<void>;
};

export default function AccountBookEditModal({
    isOpen,
    accountBook,
    categoryOptions,
    onClose,
    onSubmit,
}: AccountBookEditModalProps) {
    if (!isOpen || !accountBook || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <AccountBookEditModalContent
            key={accountBook.id}
            accountBook={accountBook}
            categoryOptions={categoryOptions}
            onClose={onClose}
            onSubmit={onSubmit}
        />,
        document.body
    );
}
