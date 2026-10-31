"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import TransactionList from "@/components/account-book/detail/transaction-list/TransactionList";
import type { TransactionViewMode } from "@/components/account-book/detail/transaction-list/TransactionViewToggle";
import TransactionDetailModal from "@/components/account-book/detail/modal/TransactionDetailModal";
import ExpenseRankingTransactionListDialog from "@/components/account-book/detail/ranking-chart/ExpenseRankingTransactionListDialog";
import { accountBookTransactionService } from "@/services/account-book/accountBookTransactionService";
import type { AccountBookTransaction, CurrencyCode } from "@/types/accountBook";
import type { ExpenseRankingSelection } from "@/utils/account-book/expenseRanking";

type Props = {
    accountBookId: number;
    type: "CATEGORY" | "STORE";
    selection: ExpenseRankingSelection;
    year: number | null;
    month: number | null;
    currencyCode: CurrencyCode;
    onClose: () => void;
};

export default function ExpenseRankingTransactionsModal({
    accountBookId, type, selection, year, month, currencyCode, onClose,
}: Props) {
    const t = useTranslations("AccountBook.detail.rankingChart");
    const formatAmount = useAmountFormatter();
    const [page, setPage] = useState(0);
    const [viewMode, setViewMode] = useState<TransactionViewMode>("CARD");
    const [detailTransaction, setDetailTransaction] = useState<AccountBookTransaction | null>(null);
    const closeDetail = useCallback(() => setDetailTransaction(null), []);
    const chartFilter = {
        type,
        keys: selection.excludedGroupKeys ?? selection.groupKeys,
        exclude: selection.excludedGroupKeys !== undefined,
    };

    // 집계 키와 기간을 서버에 전달해 페이지 밖의 거래도 같은 조건으로 조회한다.
    const { data, isLoading, isError, mutate } = useQuery({
        keys: ["account-book-chart-transactions", accountBookId, type, year ?? "ALL", month ?? "ALL", JSON.stringify(chartFilter), page] as const,
        fetcher: () => accountBookTransactionService.listTransactions(accountBookId, {
            year: year ?? undefined,
            month: month ?? undefined,
            type: "EXPENSE",
            chartFilter,
            page,
            size: 20,
        }),
        config: { revalidateOnMount: true, revalidateIfStale: true, shouldRetryOnError: false },
    });

    if (detailTransaction) {
        // 상세 화면과 목록을 교대로 마운트해 포커스·스크롤 잠금의 소유자를 하나로 유지한다.
        return <TransactionDetailModal transaction={detailTransaction} currencyCode={currencyCode} onClose={closeDetail} />;
    }

    const period = year && month ? t("period.month", { year, month }) : t("period.all");
    const summary = t("transactions.summary", {
        period,
        amount: formatAmount(selection.amount, currencyCode),
        percentage: selection.percentage,
    });

    return (
        <ExpenseRankingTransactionListDialog title={t("transactions.title", { name: selection.name })} summary={summary} onClose={onClose}>
            {isError ? (
                <div role="alert" className="space-y-3 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <p>{t("transactions.loadFailed")}</p>
                    <button type="button" onClick={() => void mutate()} className="rounded-lg border border-current px-3 py-2">
                        {t("transactions.retry")}
                    </button>
                </div>
            ) : isLoading ? (
                <p role="status" className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>
            ) : (
                <TransactionList transactions={data?.page.content ?? []} currencyCode={currencyCode}
                    viewMode={viewMode} onChangeViewMode={setViewMode}
                    onClickDetailTransaction={setDetailTransaction}
                    totalElements={data?.page.page.totalElements ?? 0}
                    page={page} totalPages={data?.page.page.totalPages ?? 0} onChangePage={setPage} />
            )}
        </ExpenseRankingTransactionListDialog>
    );
}
