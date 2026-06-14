import { useState } from "react";
import { AccountBook } from "@/types/accountBook";

export function useAccountBookListModals() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAccountBook, setEditingAccountBook] =
        useState<AccountBook | null>(null);
    const [deleteTargetAccountBook, setDeleteTargetAccountBook] =
        useState<AccountBook | null>(null);
    const [memberTargetAccountBook, setMemberTargetAccountBook] =
        useState<AccountBook | null>(null);

    return {
        isCreateModalOpen,
        openCreateModal: () => setIsCreateModalOpen(true),
        closeCreateModal: () => setIsCreateModalOpen(false),

        editingAccountBook,
        openEditModal: setEditingAccountBook,
        closeEditModal: () => setEditingAccountBook(null),

        deleteTargetAccountBook,
        openDeleteConfirm: setDeleteTargetAccountBook,
        closeDeleteConfirm: () => setDeleteTargetAccountBook(null),

        memberTargetAccountBook,
        openMemberModal: setMemberTargetAccountBook,
        closeMemberModal: () => setMemberTargetAccountBook(null),
    };
}
