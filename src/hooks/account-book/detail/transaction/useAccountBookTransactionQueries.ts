import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { accountBookDetailQueryKeys } from "../accountBookDetailQueryKeys";
import { accountBookCategoryService } from "@/services/account-book/accountBookCategoryService";
import { accountBookTransactionService } from "@/services/account-book/accountBookTransactionService";
import { parseSelectedMonthValue } from "@/utils/account-book/detail/month";
import type { TransactionFilterType } from "@/types/accountBook";

type Params = {
    accountBookId: number;
    selectedMonth: string;
    transactionPage: number;
    filterType: TransactionFilterType;
    transactionKeyword: string;
};

export function useAccountBookTransactionQueries({
    accountBookId,
    selectedMonth,
    transactionPage,
    filterType,
    transactionKeyword,
}: Params) {
    const t = useTranslations("AccountBook.detail");
    const { data: transactionMonthOptions = [], mutate: mutateTransactionMonthOptions, } = useQuery({
        keys: accountBookDetailQueryKeys.transactionMonths(accountBookId),
        fetcher: (_, accountBookId) => accountBookTransactionService.listTransactionMonths(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });
    const {
        data: transactionResponse,
        isLoading: isTransactionLoading,
        isError: transactionQueryError,
        mutate: mutateTransactions,
    } = useQuery({
        keys: accountBookDetailQueryKeys.transactions(
            accountBookId,
            selectedMonth,
            transactionPage,
            filterType,
            transactionKeyword
        ),
        fetcher: (
            _,
            accountBookId,
            selectedMonthValue,
            page,
            type,
            keywordValue
        ) => {
            const parsedMonth = parseSelectedMonthValue(selectedMonthValue);
            return accountBookTransactionService.listTransactions(
                accountBookId,
                {
                    year: parsedMonth?.year,
                    month: parsedMonth?.month,
                    page,
                    size: 20,
                    type: type === "ALL" ? undefined : type,
                    keyword: keywordValue || undefined,
                }
            );
        },
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });
    const {
        data: categoryOptions = [],
        isLoading: isCategoryLoading,
        isError: categoryQueryError,
        mutate: mutateCategories
    } = useQuery({
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
    const { data: incomeSourceOptions = [] } = useQuery({
        keys: accountBookDetailQueryKeys.storeSuggestions(accountBookId, "INCOME"),
        fetcher: (_, accountBookId, type) => accountBookTransactionService.listStoreSuggestions(accountBookId, type),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });
    const categoryOptionsStatus = isCategoryLoading ? "loading" as const
        : categoryQueryError ? "error" as const
            : categoryOptions.length ? "ready" as const : "empty" as const;
    const transactions = useMemo(() => {
        return transactionResponse?.page.content ?? [];
    }, [transactionResponse?.page.content]);
    const transactionTotalPages = transactionResponse?.page.page.totalPages ?? 0;
    const transactionError = transactionQueryError
        ? t("transaction.loadError")
        : null;

    return {
        transactionMonthOptions,
        mutateTransactionMonthOptions,
        isTransactionLoading,
        mutateTransactions,
        categoryOptions,
        categoryOptionsStatus,
        mutateCategories,
        storeOptions,
        incomeSourceOptions,
        transactions,
        transactionTotalPages,
        transactionError,
    };
}
