import { useTranslations } from "next-intl";
import { CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import {
    getBudgetDiff,
    MonthlyExpenseChartRow,
} from "@/components/account-book/detail/monthly-chart/monthlyExpenseChartUtils";

type MonthlyExpenseChartStatusCardProps = {
    row: MonthlyExpenseChartRow;
    currencyCode: CurrencyCode;
};

export default function MonthlyExpenseChartStatusCard({
    row,
    currencyCode,
}: MonthlyExpenseChartStatusCardProps) {
    const t = useTranslations("AccountBook.detail.monthlyChart.status");

    const budgetDiff = getBudgetDiff(row);

    const label =
        budgetDiff == null
            ? t("unsetLabel")
            : budgetDiff > 0
                ? t("overLabel")
                : budgetDiff < 0
                    ? t("withinLabel")
                    : t("justLabel");

    const description =
        budgetDiff == null
            ? t("unsetDescription")
            : budgetDiff > 0
                ? t("overDescription", {
                    amount: formatAmount(budgetDiff, currencyCode),
                })
                : budgetDiff < 0
                    ? t("remainingDescription", {
                        amount: formatAmount(Math.abs(budgetDiff), currencyCode),
                    })
                    : t("justDescription");

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
            <p className="font-semibold text-slate-900 dark:text-white">
                {row.monthLabel}：{label}
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </div>
    );
}