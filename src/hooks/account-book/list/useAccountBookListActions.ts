import { useState } from "react";
import { useTranslations } from "next-intl";
import {
    AccountBook,
    AccountBookEditFormValues,
    CreateAccountBookFormValues,
} from "@/types/accountBook";
import { UseQueryMutate } from "@/hooks/useQuery";
import { accountBookService } from "@/services/account-book/accountBookService";
import { accountBookMonthlyGoalService } from "@/services/account-book/accountBookMonthlyGoalService";
import { getCurrentYearMonth } from "@/utils/dateUtils";

type UseAccountBookListActionsProps = {
    mutateAccountBooks: UseQueryMutate<AccountBook[]>;
    mutateAccountBookCategoryOptions: UseQueryMutate<AccountBook[]>;
    openEditModal: (accountBook: AccountBook) => void;
    closeEditModal: () => void;
    deleteTargetAccountBook: AccountBook | null;
    closeDeleteConfirm: () => void;
};

export function useAccountBookListActions({
    mutateAccountBooks,
    mutateAccountBookCategoryOptions,
    openEditModal,
    closeEditModal,
    deleteTargetAccountBook,
    closeDeleteConfirm,
}: UseAccountBookListActionsProps) {
    const t = useTranslations("AccountBook");
    const [isDeleting, setIsDeleting] = useState(false);

    const revalidateAccountBookList = async () => {
        await Promise.all([
            mutateAccountBooks((currentData) => currentData, true),
            mutateAccountBookCategoryOptions((currentData) => currentData, true),
        ]);
    };

    const handleCreateAccountBook = async (
        values: CreateAccountBookFormValues
    ) => {
        const category =
            values.categoryMode === "NEW"
                ? values.newCategoryName?.trim()
                : values.categoryName?.trim();

        if (!category) {
            return;
        }

        try {
            const createdAccountBook = await accountBookService.register({
                name: values.name,
                description: values.description,
                category,
                currencyCode: values.currencyCode,
            });

            if (values.expenseGoalAmount && values.expenseGoalAmount > 0) {
                const { year, month } = getCurrentYearMonth();

                await accountBookMonthlyGoalService.saveMonthlyGoal(
                    createdAccountBook.id,
                    {
                        year,
                        month,
                        goalAmount: values.expenseGoalAmount,
                    }
                );
            }

            await revalidateAccountBookList();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.createFailed"));
            throw error;
        }
    };

    const handleEdit = async (accountBook: AccountBook) => {
        const { year, month } = getCurrentYearMonth();

        try {
            const monthlyGoal =
                await accountBookMonthlyGoalService.getMonthlyGoal(
                    accountBook.id,
                    year,
                    month
                );

            openEditModal({
                ...accountBook,
                expenseGoalAmount: monthlyGoal.goalAmount ?? null,
            });
        } catch (error) {
            console.error(error);
            window.alert(t("messages.loadMonthlyGoalFailed"));
            openEditModal({
                ...accountBook,
                expenseGoalAmount: null,
            });
        }
    };

    const handleUpdateAccountBook = async (
        accountBookId: number,
        values: AccountBookEditFormValues
    ) => {
        const {
            expenseGoalAmount,
            shouldDeleteMonthlyGoal,
            ...accountBookUpdateRequest
        } = values;

        try {
            const updatedAccountBook = await accountBookService.update(
                accountBookId,
                accountBookUpdateRequest
            );

            const { year, month } = getCurrentYearMonth();

            if (expenseGoalAmount && expenseGoalAmount > 0) {
                await accountBookMonthlyGoalService.saveMonthlyGoal(
                    accountBookId,
                    {
                        year,
                        month,
                        goalAmount: expenseGoalAmount,
                    }
                );
            } else if (shouldDeleteMonthlyGoal) {
                await accountBookMonthlyGoalService.deleteMonthlyGoal(
                    accountBookId,
                    year,
                    month
                );
            }

            await mutateAccountBooks((currentData) => {
                if (!currentData) {
                    return [updatedAccountBook];
                }

                return currentData.map((accountBook) =>
                    accountBook.id === accountBookId
                        ? {
                              ...updatedAccountBook,
                              expenseGoalAmount,
                          }
                        : accountBook
                );
            }, false);

            closeEditModal();
            await revalidateAccountBookList();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.updateFailed"));
            throw error;
        }
    };

    const handleCloseDeleteConfirm = () => {
        if (isDeleting) {
            return;
        }

        closeDeleteConfirm();
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetAccountBook || isDeleting) {
            return;
        }

        const accountBookId = deleteTargetAccountBook.id;

        try {
            setIsDeleting(true);

            await accountBookService.remove(accountBookId);

            await mutateAccountBooks((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (accountBook) => accountBook.id !== accountBookId
                );
            }, false);

            closeDeleteConfirm();
            await revalidateAccountBookList();
        } catch (error) {
            console.error(error);
            window.alert(t("messages.deleteFailed"));
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        isDeleting,
        handleCreateAccountBook,
        handleEdit,
        handleUpdateAccountBook,
        handleCloseDeleteConfirm,
        handleConfirmDelete,
    };
}
