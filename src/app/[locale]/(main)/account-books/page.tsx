"use client";

import AccountBooksHeroSection from "@/components/account-book/list/AccountBooksHeroSection";
import AccountBooksContentSection from "@/components/account-book/list/AccountBooksContentSection";
import AccountBooksPageModals from "@/components/account-book/list/AccountBooksPageModals";
import { useAccountBookListFilters } from "@/hooks/account-book/list/useAccountBookListFilters";
import { useAccountBookListQueries } from "@/hooks/account-book/list/useAccountBookListQueries";
import { useAccountBookListModals } from "@/hooks/account-book/list/useAccountBookListModals";
import { useAccountBookListActions } from "@/hooks/account-book/list/useAccountBookListActions";

const FALLBACK_CATEGORY_NAME = "기타";

export default function AccountBooksPage() {
    const filters = useAccountBookListFilters();

    const queries = useAccountBookListQueries({
        searchKeyword: filters.debouncedSearchKeyword,
        selectedCategory: filters.selectedCategory,
        fallbackCategoryName: FALLBACK_CATEGORY_NAME,
    });

    const modals = useAccountBookListModals();

    const actions = useAccountBookListActions({
        mutateAccountBooks: queries.mutateAccountBooks,
        mutateAccountBookCategoryOptions:
            queries.mutateAccountBookCategoryOptions,
        openEditModal: modals.openEditModal,
        closeEditModal: modals.closeEditModal,
        deleteTargetAccountBook: modals.deleteTargetAccountBook,
        closeDeleteConfirm: modals.closeDeleteConfirm,
    });

    return (
        <>
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 pt-20 sm:px-6 lg:px-8">
                <AccountBooksHeroSection
                    searchKeyword={filters.searchKeyword}
                    selectedCategory={filters.selectedCategory}
                    categoryOptions={queries.categoryOptions}
                    totalAccountBookCount={queries.totalAccountBookCount}
                    onChangeSearchKeyword={filters.setSearchKeyword}
                    onChangeCategory={filters.setSelectedCategory}
                    onOpenCreateModal={modals.openCreateModal}
                />

                <AccountBooksContentSection
                    isLoading={queries.isLoading}
                    isError={queries.accountBooksQueryError}
                    categories={queries.categories}
                    onEditAccountBook={actions.handleEdit}
                    onDeleteAccountBook={modals.openDeleteConfirm}
                    onManageMembers={modals.openMemberModal}
                />
            </main>

            <AccountBooksPageModals
                isCreateModalOpen={modals.isCreateModalOpen}
                editingAccountBook={modals.editingAccountBook}
                deleteTargetAccountBook={modals.deleteTargetAccountBook}
                memberTargetAccountBook={modals.memberTargetAccountBook}
                categoryOptions={queries.categoryOptions}
                currencies={queries.currencies}
                isCurrencyLoading={queries.isCurrencyLoading}
                isDeleting={actions.isDeleting}
                onCloseCreateModal={modals.closeCreateModal}
                onCloseEditModal={modals.closeEditModal}
                onCloseDeleteConfirm={actions.handleCloseDeleteConfirm}
                onCloseMemberModal={modals.closeMemberModal}
                onCreateAccountBook={actions.handleCreateAccountBook}
                onUpdateAccountBook={actions.handleUpdateAccountBook}
                onConfirmDelete={actions.handleConfirmDelete}
            />
        </>
    );
}
