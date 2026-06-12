import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Pencil } from "lucide-react";
import { AccountBookTransaction, CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import {useTranslations} from "next-intl";

type TransactionListItemProps = {
    transaction: AccountBookTransaction;
    currencyCode: CurrencyCode;
    onClickEditTransaction?: (transaction: AccountBookTransaction) => void;
    onClickDeleteTransaction: (transaction: AccountBookTransaction) => void;
};

function TransactionMemoText({ memo }: { memo?: string | null }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!memo) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mt-1 block w-full text-left text-xs text-slate-400 transition hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400"
        >
            <span
                className={
                    isExpanded
                        ? "block whitespace-pre-wrap wrap-break-word"
                        : "block truncate"
                }
            >
                {memo}
            </span>

            {memo.length > 30 && (
                <span className="mt-1 block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {isExpanded ? "접기" : "더보기"}
                </span>
            )}
        </button>
    );
}

export default function TransactionListItem({
    transaction,
    currencyCode,
    onClickEditTransaction,
    onClickDeleteTransaction,
}: TransactionListItemProps) {
    const t = useTranslations("AccountBook.detail.transactionList");
    const isFixedCostTransaction = transaction.sourceType === "FIXED_COST";
    const isIncome = transaction.type === "INCOME";

    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50/80 hover:shadow-md dark:border-white/10 dark:bg-black/25 dark:hover:border-orange-400/60 dark:hover:bg-zinc-900/80">
            <div className="flex min-w-0 items-center gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isIncome
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                            : "bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                    }`}
                >
                    {isIncome ? (
                        <ArrowUpCircle size={20} />
                    ) : (
                        <ArrowDownCircle size={20} />
                    )}
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {transaction.title}
                            </p>

                            {isFixedCostTransaction && (
                                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                                    {t("badges.fixedCost")}
                                </span>
                            )}
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {transaction.category}
                        </span>
                    </div>

                    {transaction.storeName && (
                        <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                            {transaction.storeName}
                        </p>
                    )}

                    <TransactionMemoText memo={transaction.memo} />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <p
                    className={`shrink-0 text-right text-sm font-bold ${
                        isIncome
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-red-500 dark:text-red-400"
                    }`}
                >
                    {isIncome ? "+" : "-"}
                    {formatAmount(transaction.amount, currencyCode)}
                </p>

                {onClickEditTransaction && (
                    <button
                        type="button"
                        onClick={() => onClickEditTransaction(transaction)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-orange-500 dark:hover:bg-white/10 dark:hover:text-orange-400"
                        aria-label="거래 수정"
                    >
                        <Pencil size={15} />
                    </button>
                )}
            </div>
        </div>
    );
}