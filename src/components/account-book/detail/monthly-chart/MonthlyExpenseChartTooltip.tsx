import { useTranslations } from "next-intl";
import { CurrencyCode } from "@/types/accountBook";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import { unitsToDecimal } from "@/utils/account-book/decimalMoney";
import {
    getBudgetDiff,
    MonthlyExpenseChartRow,
} from "@/components/account-book/detail/monthly-chart/monthlyExpenseChartUtils";

type TooltipPayloadItem = {
    name?: string;
    dataKey?: string;
    value?: number | null;
    payload?: MonthlyExpenseChartRow;
};

type MonthlyExpenseChartTooltipProps = {
    active?: boolean;
    label?: string;
    payload?: TooltipPayloadItem[];
    currencyCode: CurrencyCode;
};

export default function MonthlyExpenseChartTooltip({
   active,
   label,
   payload,
   currencyCode,
}: MonthlyExpenseChartTooltipProps) {
    const formatAmount = useAmountFormatter();
    const t = useTranslations("AccountBook.detail.monthlyChart.tooltip");

    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const row = payload[0]?.payload;
    const budgetDiff = row ? getBudgetDiff(row) : null;

    const budgetDiffLabel =
        budgetDiff == null
            ? t("goalUnset")
            : budgetDiff > 0
                ? t("over", {
                    amount: formatAmount(unitsToDecimal(budgetDiff), currencyCode),
                })
                : budgetDiff < 0
                    ? t("remaining", {
                        amount: formatAmount(unitsToDecimal(-budgetDiff), currencyCode),
                    })
                    : t("just");

    return (
        <div className="max-w-[min(18rem,calc(100vw-3rem))] break-words rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-lg dark:border-white/10 dark:bg-zinc-900/95">
            <p className="mb-2 font-semibold text-slate-900 dark:text-white">
                {label}
            </p>

            <div className="space-y-1">
                {payload.map((item) => {
                    const rawAmount = item.dataKey === "goalPlot" ? item.payload?.expenseGoalAmount : item.payload?.expenseAmount;
                    return (
                    <div
                        key={String(item.dataKey)}
                        className="flex flex-wrap items-center justify-between gap-2"
                    >
                        <span className="text-slate-500 dark:text-slate-400">
                            {item.name}
                        </span>

                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            {rawAmount == null
                                ? t("unset")
                                : formatAmount(rawAmount, currencyCode)}
                        </span>
                    </div>
                );})}

                <div className="mt-2 border-t border-slate-200 pt-2 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">
                            {t("goalDiff")}
                        </span>

                        <span
                            className={[
                                "font-semibold",
                                budgetDiff == null
                                    ? "text-slate-500 dark:text-slate-400"
                                    : budgetDiff > 0
                                        ? "text-red-600 dark:text-red-400"
                                        : budgetDiff < 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-orange-600 dark:text-orange-400",
                            ].join(" ")}
                        >
                            {budgetDiffLabel}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
