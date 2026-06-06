"use client";

import {
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { AccountBookTransaction, CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import type { PieLabelRenderProps } from "recharts";

type ExpenseBreakdownItem = {
    name: string;
    amount: number;
    percentage: number;
};

type ExpenseBreakdownPieChartProps = {
    title: string;
    description: string;
    data: ExpenseBreakdownItem[];
    currencyCode: CurrencyCode;
};

type TooltipPayloadItem = {
    payload?: ExpenseBreakdownItem;
};

type CustomTooltipProps = {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    currencyCode: CurrencyCode;
};

const COLORS = [
    "#f97316",
    "#60a5fa",
    "#34d399",
    "#facc15",
    "#a78bfa",
    "#fb7185",
];

function CustomTooltip({
   active,
   payload,
   currencyCode,
}: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const item = payload[0]?.payload;

    if (!item) {
        return null;
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-lg dark:border-white/10 dark:bg-zinc-900/95">
            <p className="font-semibold text-slate-900 dark:text-white">
                {item.name}
            </p>

            <p className="mt-1 text-slate-600 dark:text-slate-300">
                {formatAmount(item.amount, currencyCode)}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                全体の {item.percentage.toFixed(1)}%
            </p>
        </div>
    );
}

export function buildExpenseBreakdownData(
    transactions: AccountBookTransaction[],
    getName: (transaction: AccountBookTransaction) => string,
    topN = 5
): ExpenseBreakdownItem[] {
    const amountByName = transactions
        .filter((transaction) => transaction.type === "EXPENSE")
        .reduce<Record<string, number>>((result, transaction) => {
            const name = getName(transaction).trim() || "未設定";

            result[name] = (result[name] ?? 0) + transaction.amount;

            return result;
        }, {});

    const sortedItems = Object.entries(amountByName)
        .map(([name, amount]) => ({
            name,
            amount,
        }))
        .sort((a, b) => b.amount - a.amount);

    const topItems = sortedItems.slice(0, topN);
    const etcAmount = sortedItems
        .slice(topN)
        .reduce((total, item) => total + item.amount, 0);

    const mergedItems =
        etcAmount > 0
            ? [...topItems, { name: "その他", amount: etcAmount }]
            : topItems;

    const totalAmount = mergedItems.reduce(
        (total, item) => total + item.amount,
        0
    );

    return mergedItems.map((item) => ({
        ...item,
        percentage: totalAmount === 0 ? 0 : (item.amount / totalAmount) * 100,
    }));
}

function renderPieLabel(props: PieLabelRenderProps) {
    const item = props.payload as ExpenseBreakdownItem | undefined;

    if (!item || item.percentage < 8) {
        return "";
    }

    return `${item.name} ${item.percentage.toFixed(0)}%`;
}

export default function ExpenseBreakdownPieChart({
    title,
    description,
    data,
    currencyCode,
}: ExpenseBreakdownPieChartProps) {
    if (data.length === 0) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    表示できる支出データがありません。
                </p>
            </section>
        );
    }

    const chartData = data.map((item, index) => ({
        ...item,
        fill: COLORS[index % COLORS.length],
    }));

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/90 dark:shadow-black/30">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {title}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={54}
                            outerRadius={92}
                            paddingAngle={3}
                            labelLine={false}
                            label={renderPieLabel}
                        />

                        <Tooltip
                            content={
                                <CustomTooltip currencyCode={currencyCode} />
                            }
                        />

                        <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            formatter={(value) => (
                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                    {value}
                                </span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}