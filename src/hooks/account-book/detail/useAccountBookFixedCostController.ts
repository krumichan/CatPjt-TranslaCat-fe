import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { accountBookFixedCostService } from "@/services/account-book/accountBookFixedCostService";
import { accountBookCategoryService } from "@/services/account-book/accountBookCategoryService";
import { accountBookTransactionService } from "@/services/account-book/accountBookTransactionService";
import { accountBookDetailQueryKeys } from "@/hooks/account-book/detail/accountBookDetailQueryKeys";
import { useAccountBookDetailRevalidation } from "@/hooks/account-book/detail/useAccountBookDetailRevalidation";
import { parseSelectedMonthValue } from "@/utils/account-book/detail/month";
import { sortFixedCosts } from "@/utils/account-book/detail/sortFixedCosts";
import type { AccountBookFixedCost, AccountBookFixedCostRequest } from "@/types/accountBook";

type Params = {
    accountBookId: number;
    selectedMonth: string;
};

export function useAccountBookFixedCostController({ accountBookId, selectedMonth }: Params) {
    const t = useTranslations("AccountBook.detail");
    const selectedYearMonth = parseSelectedMonthValue(selectedMonth);
    const revalidation = useAccountBookDetailRevalidation({
        accountBookId,
        selectedMonth,
    });
    const [isCreateFixedCostModalOpen, setIsCreateFixedCostModalOpen] = useState(false);
    const [editingFixedCost, setEditingFixedCost] = useState<AccountBookFixedCost | null>(null);
    const [deletingFixedCost, setDeletingFixedCost] = useState<AccountBookFixedCost | null>(null);
    const [isGeneratingFixedCostTransactions, setIsGeneratingFixedCostTransactions] = useState(false);
    const {
        data: fixedCosts = [],
        isLoading: isFixedCostsLoading,
        isError: fixedCostsQueryError,
        mutate: mutateFixedCosts,
    } = useQuery({
        keys: accountBookDetailQueryKeys.fixedCosts(accountBookId),
        fetcher: (_, accountBookId) => accountBookFixedCostService.listFixedCosts(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });
    const { data: categoryOptions = [] } = useQuery({
        keys: accountBookDetailQueryKeys.categories(accountBookId),
        fetcher: (_, accountBookId) => accountBookCategoryService.listCategories(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });
    const { data: storeOptions = [] } = useQuery({
        keys: accountBookDetailQueryKeys.storeSuggestions(accountBookId, "EXPENSE"),
        fetcher: (_, accountBookId, type) => accountBookTransactionService.listStoreSuggestions(accountBookId, type),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });
    const { data: fixedCostGenerationTargets, mutate: mutateFixedCostGenerationTargets, } = useQuery({
        keys: selectedYearMonth
            ? accountBookDetailQueryKeys.fixedCostGenerationTargets(accountBookId, selectedYearMonth.year, selectedYearMonth.month)
            : null,
        fetcher: (
            _,
            accountBookId,
            year,
            month
        ) => accountBookFixedCostService.getGenerationTargets(accountBookId, year, month),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });
    const fixedCostsError = fixedCostsQueryError
        ? t("fixedCost.messages.loadFailed")
        : null;

    const handleCloseFixedCostModal = () => {
        setIsCreateFixedCostModalOpen(false);
        setEditingFixedCost(null);
    };

    const handleCreateFixedCost = async (values: AccountBookFixedCostRequest) => {
        try {
            const createdFixedCost = await accountBookFixedCostService.createFixedCost(accountBookId, values);
            await mutateFixedCosts(
                (currentData) => {
                    const nextData = currentData
                        ? [createdFixedCost, ...currentData]
                        : [createdFixedCost];
                    return sortFixedCosts(nextData);
                },
                false
            );
            await revalidation.revalidateFixedCostRelated();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.createFailed"));
            throw error;
        }
    };

    const handleUpdateFixedCost = async (fixedCostId: number, values: AccountBookFixedCostRequest) => {
        try {
            const updatedFixedCost = await accountBookFixedCostService.updateFixedCost(accountBookId, fixedCostId, values);
            await mutateFixedCosts(
                (currentData) => {
                    if (!currentData) {
                        return [updatedFixedCost];
                    }
                    return sortFixedCosts(currentData.map((fixedCost) => fixedCost.id === fixedCostId
                        ? updatedFixedCost
                        : fixedCost));
                },
                false
            );
            await revalidation.revalidateFixedCostRelated();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.updateFailed"));
            throw error;
        }
    };

    const handleSubmitFixedCost = async (values: AccountBookFixedCostRequest) => {
        if (editingFixedCost) {
            await handleUpdateFixedCost(editingFixedCost.id, values);
            return;
        }
        await handleCreateFixedCost(values);
    };

    const handleChangeFixedCostActive = async (fixedCostId: number, active: boolean) => {
        try {
            const updatedFixedCost = await accountBookFixedCostService.updateActive(accountBookId, fixedCostId, { active });
            await mutateFixedCosts(
                (currentData) => {
                    if (!currentData) {
                        return [updatedFixedCost];
                    }
                    return sortFixedCosts(currentData.map((fixedCost) => fixedCost.id === fixedCostId
                        ? updatedFixedCost
                        : fixedCost));
                },
                false
            );
            await revalidation.revalidateFixedCostGenerationTargets();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.updateFailed"));
        }
    };

    const handleDeleteFixedCost = async () => {
        if (!deletingFixedCost) {
            return;
        }
        try {
            await accountBookFixedCostService.deleteFixedCost(accountBookId, deletingFixedCost.id);
            await mutateFixedCosts(
                (currentData) => {
                    if (!currentData) {
                        return [];
                    }
                    return currentData.filter((fixedCost) => fixedCost.id !== deletingFixedCost.id);
                },
                false
            );
            setDeletingFixedCost(null);
            await revalidation.revalidateFixedCostRelated();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.messages.deleteFailed"));
            throw error;
        }
    };

    const handleGenerateFixedCostTransactions = async () => {
        if (!selectedYearMonth || isGeneratingFixedCostTransactions) {
            return;
        }
        try {
            setIsGeneratingFixedCostTransactions(true);
            await accountBookFixedCostService.generateTransactions(
                accountBookId,
                {
                    year: selectedYearMonth.year,
                    month: selectedYearMonth.month,
                }
            );
            await mutateFixedCostGenerationTargets(
                (currentData) => currentData
                    ? {
                        ...currentData,
                        count: 0,
                        targets: [],
                    }
                    : currentData,
                false
            );
            await revalidation.revalidateAfterFixedCostTransactionGeneration();
        } catch (error) {
            console.error(error);
            alert(t("fixedCost.generation.messages.generateFailed"));
        } finally {
            setIsGeneratingFixedCostTransactions(false);
        }
    };

    return {
        fixedCostGenerationTargets,
        isGeneratingFixedCostTransactions,
        handleGenerateFixedCostTransactions,
        fixedCosts,
        isFixedCostsLoading,
        fixedCostsError,
        setIsCreateFixedCostModalOpen,
        setEditingFixedCost,
        setDeletingFixedCost,
        handleChangeFixedCostActive,
        isCreateFixedCostModalOpen,
        editingFixedCost,
        categoryOptions,
        storeOptions,
        handleCloseFixedCostModal,
        handleSubmitFixedCost,
        deletingFixedCost,
        handleDeleteFixedCost
    };
}
