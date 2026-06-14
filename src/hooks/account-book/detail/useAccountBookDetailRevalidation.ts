import { useSWRConfig } from "swr";
import { accountBookDetailQueryKeys } from "@/hooks/account-book/detail/accountBookDetailQueryKeys";
import { parseSelectedMonthValue } from "@/utils/account-book/detail/month";

type UseAccountBookDetailRevalidationArgs = {
    accountBookId: number;
    selectedMonth: string;
};

function isAccountBookKey(
    key: unknown,
    prefix: string,
    accountBookId: number
): boolean {
    return Array.isArray(key) && key[0] === prefix && key[1] === accountBookId;
}

export function useAccountBookDetailRevalidation({
    accountBookId,
    selectedMonth,
}: UseAccountBookDetailRevalidationArgs) {
    const { mutate } = useSWRConfig();
    const selectedYearMonth = parseSelectedMonthValue(selectedMonth);

    const revalidateAccountBookDetail = () =>
        mutate(accountBookDetailQueryKeys.detail(accountBookId));

    const revalidateSummary = () =>
        mutate(accountBookDetailQueryKeys.summary(accountBookId, selectedMonth));

    const revalidateMonthlyGoal = () => {
        if (!selectedYearMonth) {
            return Promise.resolve();
        }

        return mutate(
            accountBookDetailQueryKeys.monthlyGoal(
                accountBookId,
                selectedYearMonth.year,
                selectedYearMonth.month
            )
        );
    };

    const revalidateTransactionMonths = () =>
        mutate(accountBookDetailQueryKeys.transactionMonths(accountBookId));

    const revalidateFixedCosts = () =>
        mutate(accountBookDetailQueryKeys.fixedCosts(accountBookId));

    const revalidateCategoryOptions = () =>
        mutate(accountBookDetailQueryKeys.categories(accountBookId));

    const revalidateStoreOptions = () =>
        mutate(accountBookDetailQueryKeys.storeSuggestions(accountBookId));

    const revalidateFixedCostGenerationTargets = () => {
        if (!selectedYearMonth) {
            return Promise.resolve();
        }

        return mutate(
            accountBookDetailQueryKeys.fixedCostGenerationTargets(
                accountBookId,
                selectedYearMonth.year,
                selectedYearMonth.month
            )
        );
    };

    const revalidateTransactions = () =>
        mutate((key) =>
            isAccountBookKey(key, "account-book-transactions", accountBookId)
        );

    const revalidateCharts = () =>
        Promise.all([
            mutate((key) =>
                isAccountBookKey(key, "account-book-monthly-chart", accountBookId)
            ),
            mutate((key) =>
                isAccountBookKey(
                    key,
                    "account-book-category-ranking-chart",
                    accountBookId
                )
            ),
            mutate((key) =>
                isAccountBookKey(
                    key,
                    "account-book-store-ranking-chart",
                    accountBookId
                )
            ),
        ]);

    const revalidateTransactionRelated = async () => {
        await Promise.all([
            revalidateTransactions(),
            revalidateSummary(),
            revalidateMonthlyGoal(),
            revalidateTransactionMonths(),
            revalidateCategoryOptions(),
            revalidateStoreOptions(),
            revalidateCharts(),
        ]);
    };

    const revalidateFixedCostRelated = async () => {
        await Promise.all([
            revalidateFixedCosts(),
            revalidateCategoryOptions(),
            revalidateStoreOptions(),
            revalidateFixedCostGenerationTargets(),
        ]);
    };

    const revalidateAfterFixedCostTransactionGeneration = async () => {
        await Promise.all([
            revalidateFixedCostGenerationTargets(),
            revalidateTransactionRelated(),
        ]);
    };

    return {
        selectedYearMonth,
        revalidateAccountBookDetail,
        revalidateSummary,
        revalidateMonthlyGoal,
        revalidateTransactionMonths,
        revalidateFixedCosts,
        revalidateCategoryOptions,
        revalidateStoreOptions,
        revalidateFixedCostGenerationTargets,
        revalidateTransactions,
        revalidateCharts,
        revalidateTransactionRelated,
        revalidateFixedCostRelated,
        revalidateAfterFixedCostTransactionGeneration,
    };
}
