import { useMemo } from "react";
import { AccountBook, Currency } from "@/types/accountBook";
import { useQuery } from "@/hooks/useQuery";
import { accountBookService } from "@/services/account-book/accountBookService";
import { currencyService } from "@/services/currency/currencyService";
import { accountBookListQueryKeys } from "@/hooks/account-book/list/accountBookListQueryKeys";
import {
    getAccountBookCategoryOptions,
    groupAccountBooksByCategory,
} from "@/utils/account-book/list/groupAccountBooksByCategory";

type UseAccountBookListQueriesProps = {
    searchKeyword: string;
    selectedCategory: string;
    fallbackCategoryName: string;
};

export function useAccountBookListQueries({
    searchKeyword,
    selectedCategory,
    fallbackCategoryName,
}: UseAccountBookListQueriesProps) {
    const {
        data: accountBooks = [],
        isLoading,
        isError: accountBooksQueryError,
        mutate: mutateAccountBooks,
    } = useQuery({
        keys: accountBookListQueryKeys.list(searchKeyword, selectedCategory),
        fetcher: (_, keyword, category): Promise<AccountBook[]> =>
            accountBookService.list({
                keyword,
                category,
            }),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const {
        data: allAccountBooksForOptions = [],
        mutate: mutateAccountBookCategoryOptions,
    } = useQuery({
        keys: accountBookListQueryKeys.categoryOptions(),
        fetcher: (): Promise<AccountBook[]> => accountBookService.list(),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 5000,
        },
    });

    const { data: currencies = [], isLoading: isCurrencyLoading } = useQuery({
        keys: accountBookListQueryKeys.currencies(),
        fetcher: (): Promise<Currency[]> => currencyService.list(),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 5000,
        },
    });

    const categories = useMemo(
        () => groupAccountBooksByCategory(accountBooks, fallbackCategoryName),
        [accountBooks, fallbackCategoryName]
    );

    const categoryOptions = useMemo(
        () =>
            getAccountBookCategoryOptions(
                allAccountBooksForOptions,
                fallbackCategoryName
            ),
        [allAccountBooksForOptions, fallbackCategoryName]
    );

    return {
        accountBooks,
        categories,
        categoryOptions,
        totalAccountBookCount: accountBooks.length,
        isLoading,
        accountBooksQueryError,
        mutateAccountBooks,
        mutateAccountBookCategoryOptions,
        currencies,
        isCurrencyLoading,
    };
}
