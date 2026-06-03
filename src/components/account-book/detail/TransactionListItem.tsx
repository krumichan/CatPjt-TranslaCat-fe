import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { AccountBookTransaction, CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type TransactionListItemProps = {
    transaction: AccountBookTransaction;
    currencyCode: CurrencyCode;
};

export default function TransactionListItem({
    transaction,
    currencyCode,
}: TransactionListItemProps) {
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
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                            {transaction.title}
                        </p>

                        <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {transaction.categoryName}
                        </span>
                    </div>

                    {transaction.storeName && (
                        <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                            {transaction.storeName}
                        </p>
                    )}

                    {transaction.memo && (
                        <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                            {transaction.memo}
                        </p>
                    )}
                </div>
            </div>

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
        </div>
    );
}