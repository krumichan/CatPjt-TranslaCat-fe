import { useTranslations } from "next-intl";
import {
    AccountBookTransaction,
    CurrencyCode,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import { formatDateLabel } from "@/components/account-book/detail/transaction-list/transactionListUtils";
import TransactionTableMemoCell from "@/components/account-book/detail/transaction-list/TransactionTableMemoCell";

type TransactionTableViewProps = {
    transactions: AccountBookTransaction[];
    currencyCode: CurrencyCode;
    onClickEditTransaction: (transaction: AccountBookTransaction) => void;
    t: ReturnType<typeof useTranslations>;
};

export default function TransactionTableView({
    transactions,
    currencyCode,
    onClickEditTransaction,
    t,
}: TransactionTableViewProps) {
    const sortedTransactions = [...transactions].sort((a, b) =>
        b.transactionDate.localeCompare(a.transactionDate)
    );

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
            <div className="overflow-x-auto">
                <table className="min-w-240 w-full border-collapse text-sm">
                    <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold">
                            {t("table.date")}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                            {t("table.type")}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                            {t("table.title")}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                            {t("table.category")}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                            {t("table.store")}
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                            {t("table.memo")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                            {t("table.amount")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                            {t("table.manage")}
                        </th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {sortedTransactions.map((transaction) => {
                        const isIncome = transaction.type === "INCOME";

                        return (
                            <tr
                                key={transaction.id}
                                className="transition hover:bg-orange-50/70 dark:hover:bg-white/5"
                            >
                                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                                    {formatDateLabel(
                                        transaction.transactionDate
                                    )}
                                </td>

                                <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                isIncome
                                                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                                                    : "bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                                            }`}
                                        >
                                            {isIncome
                                                ? t("type.income")
                                                : t("type.expense")}
                                        </span>
                                </td>

                                <td className="max-w-45 truncate px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                    {transaction.title}
                                </td>

                                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                                    {transaction.category}
                                </td>

                                <td className="max-w-40 truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                                    {transaction.storeName || "-"}
                                </td>

                                <TransactionTableMemoCell
                                    memo={transaction.memo}
                                    t={t}
                                />

                                <td
                                    className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                                        isIncome
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-red-500 dark:text-red-400"
                                    }`}
                                >
                                    {isIncome ? "+" : "-"}
                                    {formatAmount(
                                        transaction.amount,
                                        currencyCode
                                    )}
                                </td>

                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onClickEditTransaction(
                                                transaction
                                            )
                                        }
                                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 dark:border-white/10 dark:text-slate-400 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
                                    >
                                        {t("actions.edit")}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}