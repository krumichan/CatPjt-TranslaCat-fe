"use client";

import { useTranslations } from "next-intl";
import {
    AccountBookRankingChartItem,
    CurrencyCode,
} from "@/types/accountBook";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";

type TooltipPayloadItem = {
    value?: number;
    payload?: AccountBookRankingChartItem;
};

type ExpenseRankingChartTooltipProps = {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    currencyCode: CurrencyCode;
};

export default function ExpenseRankingChartTooltip({
   active,
   payload,
   currencyCode,
}: ExpenseRankingChartTooltipProps) {
    const formatAmount = useAmountFormatter();
    const t = useTranslations("AccountBook.detail.rankingChart.tooltip");

    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const item = payload[0]?.payload;

    if (!item) {
        return null;
    }

    return (
        <div className="max-w-[min(18rem,calc(100vw-3rem))] break-words rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-lg dark:border-white/10 dark:bg-zinc-900/95">
            <p className="mb-2 font-semibold text-slate-900 dark:text-white">
                {item.name}
            </p>

            <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                        {t("amount")}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatAmount(item.amount, currencyCode)}
                    </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                        {t("percentage")}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.percentage}%
                    </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                        {t("transactionCount")}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.transactionCount}
                    </span>
                </div>
            </div>
        </div>
    );
}