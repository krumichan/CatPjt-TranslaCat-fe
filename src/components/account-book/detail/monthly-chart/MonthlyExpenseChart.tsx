"use client";

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";
import {
    AccountBookMonthlyChartItem,
    CurrencyCode,
} from "@/types/accountBook";
import MonthlyExpenseChartBudgetDot from "@/components/account-book/detail/monthly-chart/MonthlyExpenseChartBudgetDot";
import MonthlyExpenseChartTooltip from "@/components/account-book/detail/monthly-chart/MonthlyExpenseChartTooltip";
import MonthlyExpenseChartStatusCard from "@/components/account-book/detail/monthly-chart/MonthlyExpenseChartStatusCard";
import {
    getLatestBudgetStatusItem,
    hasMonthlyChartData,
    MonthlyExpenseChartRow,
} from "@/components/account-book/detail/monthly-chart/monthlyExpenseChartUtils";

type MonthlyExpenseChartProps = {
    chartItems: AccountBookMonthlyChartItem[];
    currencyCode: CurrencyCode;
    isLoading?: boolean;
};

export default function MonthlyExpenseChart({
    chartItems,
    currencyCode,
    isLoading = false,
}: MonthlyExpenseChartProps) {
    const t = useTranslations("AccountBook.detail.monthlyChart");
    const locale = useLocale();
    const axisFormatter = new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
    });

    const chartData = chartItems.map((item): MonthlyExpenseChartRow & { expensePlot: number; goalPlot: number | null } => ({
        ...item,
        monthLabel: t("monthLabel", { month: item.month }),
        // Numeric coordinates are only for drawing; preserve the decimal source fields.
        expensePlot: Number(item.expenseAmount),
        goalPlot: item.expenseGoalAmount == null ? null : Number(item.expenseGoalAmount),
    }));

    const latestStatusItem = getLatestBudgetStatusItem(chartData);
    const hasData = hasMonthlyChartData(chartData);
    const chartYear = chartItems[0]?.year;

    if (isLoading) {
        return (
            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("loading")}
                </p>
            </section>
        );
    }

    if (!hasData) {
        return (
            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("empty")}
                </p>
            </section>
        );
    }

    return (
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {t("title")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("description", {
                            year: chartYear ?? "",
                        })}
                    </p>
                </div>

                {latestStatusItem && (
                    <MonthlyExpenseChartStatusCard
                        row={latestStatusItem}
                        currencyCode={currencyCode}
                    />
                )}
            </div>

            <div className="h-72 w-full min-w-0" aria-label={currencyCode}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 8,
                            left: 0,
                            bottom: 12,
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-slate-200 dark:stroke-white/10"
                        />

                        <XAxis
                            dataKey="monthLabel"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "currentColor" }}
                            className="text-xs text-slate-500 dark:text-slate-400"
                        />

                        <YAxis
                            tickFormatter={(value) => axisFormatter.format(Number(value))}
                            tickLine={false}
                            axisLine={false}
                            width={48}
                            tick={{ fill: "currentColor" }}
                            className="text-xs text-slate-500 dark:text-slate-400"
                        />

                        <Tooltip
                            content={
                                <MonthlyExpenseChartTooltip
                                    currencyCode={currencyCode}
                                />
                            }
                        />

                        <Legend wrapperStyle={{ fontSize: 12, overflowWrap: "anywhere" }} />

                        <Line
                            type="monotone"
                            dataKey="goalPlot"
                            name={t("series.expenseGoalAmount")}
                            stroke="#60a5fa"
                            strokeWidth={2.5}
                            strokeDasharray="6 4"
                            dot={<MonthlyExpenseChartBudgetDot />}
                            activeDot={{
                                r: 5.5,
                                stroke: "#60a5fa",
                                strokeWidth: 2,
                                fill: "#60a5fa",
                            }}
                            connectNulls={false}
                        />

                        <Line
                            type="monotone"
                            dataKey="expensePlot"
                            name={t("series.expenseAmount")}
                            stroke="#f97316"
                            strokeWidth={3}
                            dot={{
                                r: 4,
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
