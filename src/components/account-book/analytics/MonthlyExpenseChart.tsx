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
import { CurrencyCode, MonthlyAnalyticsItem } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type MonthlyExpenseChartProps = {
    data: MonthlyAnalyticsItem[];
    currencyCode: CurrencyCode;
};

type TooltipPayloadItem = {
    name?: string;
    dataKey?: string;
    value?: number | null;
    color?: string;
    payload?: MonthlyAnalyticsItem;
};

type CustomTooltipProps = {
    active?: boolean;
    label?: string;
    payload?: TooltipPayloadItem[];
    currencyCode: CurrencyCode;
};

function formatMonthLabel(month: string) {
    const [, monthPart] = month.split("-");
    return `${Number(monthPart)}월`;
}

function CustomTooltip({
   active,
   label,
   payload,
   currencyCode,
}: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const row = payload[0]?.payload;

    const budgetDiff =
        row?.budgetAmount == null
            ? null
            : row.expenseAmount - row.budgetAmount;

    const budgetDiffLabel =
        budgetDiff == null
            ? "目標未設定"
            : budgetDiff > 0
                ? `${formatAmount(budgetDiff, currencyCode)} 超過`
                : `${formatAmount(Math.abs(budgetDiff), currencyCode)} 余裕あり`;

    return (
        <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-lg dark:border-white/10 dark:bg-zinc-900/95">
            <p className="mb-2 font-semibold text-slate-900 dark:text-white">
                {label}
            </p>

            <div className="space-y-1">
                {payload.map((item) => {
                    const value = item.value;

                    return (
                        <div
                            key={String(item.dataKey)}
                            className="flex items-center justify-between gap-6"
                        >
                            <span className="text-slate-500 dark:text-slate-400">
                            {item.name}
                            </span>

                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                {value == null
                                    ? "未設定"
                                    : formatAmount(value, currencyCode)}
                              </span>
                        </div>
                    );
                })}
                <div className="mt-2 border-t border-slate-200 pt-2 dark:border-white/10">
                    <div className="flex items-center justify-between gap-6">
                        <span className="text-slate-500 dark:text-slate-400">
                          目標との差額
                        </span>

                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {budgetDiffLabel}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getLatestBudgetStatus(data: MonthlyAnalyticsItem[]) {
    const latest = data[data.length - 1];

    if (!latest) {
        return null;
    }

    if (latest.budgetAmount == null) {
        return {
            month: latest.month,
            label: "目標未設定",
            description: "この月の目標金額は設定されていません。",
            isOverBudget: false,
            diffAmount: null,
        };
    }

    const diffAmount = latest.expenseAmount - latest.budgetAmount;
    const isOverBudget = diffAmount > 0;

    return {
        month: latest.month,
        label: isOverBudget ? "目標超過" : "目標内",
        description: isOverBudget
            ? `目標を${Math.abs(diffAmount).toLocaleString()}超過しています。`
            : `目標まで${Math.abs(diffAmount).toLocaleString()}残っています。`,
        isOverBudget,
        diffAmount,
    };
}

export default function MonthlyExpenseChart({
    data,
    currencyCode,
}: MonthlyExpenseChartProps) {
    const latestStatus = getLatestBudgetStatus(data);

    if (data.length === 0) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    月別支出
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    表示できるデータがありません。
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        月別支出
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        月ごとの支出額と目標金額を比較します。
                    </p>
                </div>

                {latestStatus && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                        <p className="font-semibold text-slate-900 dark:text-white">
                            {formatMonthLabel(latestStatus.month)}：{latestStatus.label}
                        </p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                            {latestStatus.description}
                        </p>
                    </div>
                )}
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 24,
                            left: 8,
                            bottom: 12,
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-slate-200 dark:stroke-white/10"
                        />

                        <XAxis
                            dataKey="month"
                            tickFormatter={formatMonthLabel}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "currentColor" }}
                            className="text-xs text-slate-500 dark:text-slate-400"
                        />

                        <YAxis
                            tickFormatter={(value) => formatAmount(Number(value), currencyCode)}
                            tickLine={false}
                            axisLine={false}
                            width={80}
                            tick={{ fill: "currentColor" }}
                            className="text-xs text-slate-500 dark:text-slate-400"
                        />

                        <Tooltip
                            content={
                                <CustomTooltip currencyCode={currencyCode} />
                            }
                        />

                        <Legend />

                        <Line
                            type="monotone"
                            dataKey="expenseAmount"
                            name="支出額"
                            stroke="#f97316"
                            strokeWidth={3}
                            dot={{
                                r: 4,
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />

                        <Line
                            type="monotone"
                            dataKey="budgetAmount"
                            name="目標金額"
                            stroke="#64748b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{
                                r: 4,
                            }}
                            connectNulls={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}