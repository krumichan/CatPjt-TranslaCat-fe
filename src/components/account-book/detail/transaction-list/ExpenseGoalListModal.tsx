import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBookMonthlyGoalListItem,
    CurrencyCode,
} from "@/types/accountBook";
import { accountBookMonthlyGoalService } from "@/services/account-book/accountBookMonthlyGoalService";
import { formatAmount } from "@/utils/account-book/formatAmount";
import {useQuery} from "@/hooks/useQuery";

type ExpenseGoalListModalProps = {
    accountBookId: number;
    currencyCode: CurrencyCode;
    isSubmitting?: boolean;
    onClose: () => void;
    onClickEdit: (
        year: number,
        month: number,
        goalAmount: number
    ) => void;
};

function formatYearMonth(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
}

export default function ExpenseGoalListModal({
    accountBookId,
    currencyCode,
    isSubmitting = false,
    onClose,
    onClickEdit,
}: ExpenseGoalListModalProps) {
    const t = useTranslations("AccountBook.detail.expenseGoal.listModal");

    const {
        data: monthlyGoals = [],
        isLoading,
        isError,
    } = useQuery<
        AccountBookMonthlyGoalListItem[],
        readonly ["account-book-monthly-goal-list", number]
    >({
        keys: ["account-book-monthly-goal-list", accountBookId] as const,
        fetcher: (_, id) => accountBookMonthlyGoalService.listMonthlyGoals(id),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
            dedupingInterval: 2000,
        },
    });

    const errorMessage = isError ? t("messages.loadFailed") : null;

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label={t("actions.close")}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {t("title")}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={t("actions.close")}
                    >
                        <X size={20} />
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        {errorMessage}
                    </div>
                )}

                {isLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
                        {t("messages.loading")}
                    </div>
                ) : monthlyGoals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-white/10 dark:bg-black/20">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {t("empty.title")}
                        </p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {t("empty.description")}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                        <div className="overflow-x-auto">
                            <table className="min-w-200 w-full border-collapse text-sm">
                                <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">
                                        {t("table.month")}
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        {t("table.goalAmount")}
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        {t("table.expenseAmount")}
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        {t("table.remainingAmount")}
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        {t("table.usageRate")}
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold">
                                        {t("table.manage")}
                                    </th>
                                </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                                {monthlyGoals.map((monthlyGoal) => (
                                    <tr
                                        key={monthlyGoal.id}
                                        className="transition hover:bg-orange-50/70 dark:hover:bg-white/5"
                                    >
                                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                                            {formatYearMonth(
                                                monthlyGoal.year,
                                                monthlyGoal.month
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                            {formatAmount(
                                                monthlyGoal.goalAmount,
                                                currencyCode
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-500 dark:text-red-400">
                                            {formatAmount(
                                                monthlyGoal.expenseAmount,
                                                currencyCode
                                            )}
                                        </td>

                                        <td
                                            className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                                                monthlyGoal.exceeded
                                                    ? "text-red-500 dark:text-red-400"
                                                    : "text-blue-600 dark:text-blue-400"
                                            }`}
                                        >
                                            {formatAmount(
                                                monthlyGoal.remainingAmount,
                                                currencyCode
                                            )}
                                        </td>

                                        <td
                                            className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                                                monthlyGoal.exceeded
                                                    ? "text-red-500 dark:text-red-400"
                                                    : "text-slate-700 dark:text-slate-200"
                                            }`}
                                        >
                                            {monthlyGoal.usageRate}%
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() =>
                                                    onClickEdit(
                                                        monthlyGoal.year,
                                                        monthlyGoal.month,
                                                        monthlyGoal.goalAmount
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-400 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
                                            >
                                                <Pencil size={13} />
                                                {t("actions.edit")}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}