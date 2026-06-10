import { useState } from "react";
import { useTranslations } from "next-intl";
import {
    AccountBookTransaction,
    CurrencyCode,
} from "@/types/accountBook";
import TransactionCardView from "@/components/account-book/detail/transaction-list/TransactionCardView";
import TransactionTableView from "@/components/account-book/detail/transaction-list/TransactionTableView";
import TransactionViewToggle, {
    TransactionViewMode,
} from "@/components/account-book/detail/transaction-list/TransactionViewToggle";
import TransactionPagination from "@/components/account-book/detail/transaction-list/TransactionPagination";

type TransactionListProps = {
    transactions: AccountBookTransaction[];
    currencyCode: CurrencyCode;
    onClickEditTransaction: (transaction: AccountBookTransaction) => void;
    isLoading?: boolean;

    page: number;
    totalPages: number;
    onChangePage: (page: number) => void;
};

export default function TransactionList({
    transactions,
    currencyCode,
    onClickEditTransaction,
    isLoading = false,
    page,
    totalPages,
    onChangePage,
}: TransactionListProps) {
    const t = useTranslations("AccountBook.detail.transactionList");

    const [viewMode, setViewMode] =
        useState<TransactionViewMode>("TABLE");

    if (isLoading && transactions.length === 0) {
        return (
            <div className="min-h-40 rounded-2xl border border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80" />
        );
    }

    if (!isLoading && transactions.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-10 text-center shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
                <p className="text-base font-semibold">
                    {t("empty.title")}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("empty.description")}
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {t("title")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("count", { count: transactions.length })}
                    </p>
                </div>

                <TransactionViewToggle
                    viewMode={viewMode}
                    onChangeViewMode={setViewMode}
                    t={t}
                />
            </div>

            {viewMode === "CARD" ? (
                <TransactionCardView
                    transactions={transactions}
                    currencyCode={currencyCode}
                    onClickEditTransaction={onClickEditTransaction}
                />
            ) : (
                <TransactionTableView
                    transactions={transactions}
                    currencyCode={currencyCode}
                    onClickEditTransaction={onClickEditTransaction}
                    t={t}
                />
            )}

            <TransactionPagination
                page={page}
                totalPages={totalPages}
                isLoading={isLoading}
                previousLabel={t("pagination.previous")}
                nextLabel={t("pagination.next")}
                onChangePage={onChangePage}
            />
        </section>
    );
}