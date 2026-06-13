"use client";

import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { useTranslations } from "next-intl";
import {
    AccountBookRankingChartItem,
    AccountBookRankingChartResponse,
    CurrencyCode,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import ExpenseRankingChartTooltip from "@/components/account-book/detail/ranking-chart/ExpenseRankingChartTooltip";
import RankingChartMessageCard from "@/components/account-book/detail/ranking-chart/RankingChartMessageCard";

type ExpenseRankingChartType = "CATEGORY" | "STORE";

type ExpenseRankingChartProps = {
    type: ExpenseRankingChartType;
    chart?: AccountBookRankingChartResponse;
    currencyCode: CurrencyCode;
    isLoading?: boolean;
    maxItems?: number;
};

const PIE_COLORS = [
    "#f97316",
    "#fb7185",
    "#60a5fa",
    "#34d399",
    "#a78bfa",
    "#facc15",
    "#38bdf8",
    "#f472b6",
];

type PieChartItem = AccountBookRankingChartItem & {
    color: string;
};

function calculatePercentage(amount: number, totalAmount: number) {
    if (totalAmount <= 0) {
        return 0;
    }

    return Number(((amount / totalAmount) * 100).toFixed(2));
}

function buildPieChartItems(
    items: AccountBookRankingChartItem[],
    totalAmount: number,
    maxItems: number,
    othersName: string
): AccountBookRankingChartItem[] {
    if (items.length <= maxItems) {
        return items;
    }

    const visibleCount = Math.max(maxItems - 1, 1);
    const visibleItems = items.slice(0, visibleCount);
    const othersItems = items.slice(visibleCount);

    const othersAmount = othersItems.reduce(
        (total, item) => total + item.amount,
        0
    );

    const othersTransactionCount = othersItems.reduce(
        (total, item) => total + item.transactionCount,
        0
    );

    return [
        ...visibleItems,
        {
            name: othersName,
            amount: othersAmount,
            transactionCount: othersTransactionCount,
            percentage: calculatePercentage(othersAmount, totalAmount),
        },
    ];
}

export default function ExpenseRankingChart({
    type,
    chart,
    currencyCode,
    isLoading = false,
    maxItems = 8,
}: ExpenseRankingChartProps) {
    const t = useTranslations("AccountBook.detail.rankingChart");

    const typeKey = type === "CATEGORY" ? "category" : "store";
    const title = t(`${typeKey}.title`);

    if (isLoading) {
        return (
            <RankingChartMessageCard
                title={title}
                message={t("loading")}
            />
        );
    }

    if (!chart) {
        return (
            <RankingChartMessageCard
                title={title}
                message={t("empty")}
            />
        );
    }

    const periodLabel =
        chart.year && chart.month
            ? t("period.month", {
                year: chart.year,
                month: chart.month,
            })
            : t("period.all");

    const hasData = chart.items.length > 0 && chart.totalAmount > 0;

    if (!hasData) {
        return (
            <RankingChartMessageCard
                title={title}
                message={t("empty")}
            />
        );
    }

    const chartItems: PieChartItem[] = buildPieChartItems(
        chart.items,
        chart.totalAmount,
        maxItems,
        t("others")
    ).map((item, index) => ({
        ...item,
        color: PIE_COLORS[index % PIE_COLORS.length],
    }));

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t(`${typeKey}.description`, {
                            period: periodLabel,
                        })}
                    </p>
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
                <div className="relative h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip
                                content={
                                    <ExpenseRankingChartTooltip
                                        currencyCode={currencyCode}
                                    />
                                }
                            />

                            <Pie
                                data={chartItems}
                                dataKey="amount"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={96}
                                paddingAngle={3}
                                cornerRadius={6}
                                stroke="none"
                            >
                                {chartItems.map((item) => (
                                    <Cell
                                        key={item.name}
                                        fill={item.color}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {t("total")}
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                                {formatAmount(chart.totalAmount, currencyCode)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {chartItems.map((item) => (
                        <div
                            key={item.name}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                                    {item.name}
                                </span>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="font-bold text-slate-900 dark:text-white">
                                    {item.percentage}%
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatAmount(item.amount, currencyCode)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}