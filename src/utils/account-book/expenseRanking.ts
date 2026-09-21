import type { AccountBookRankingChartItem } from "@/types/accountBook";
import { decimalToUnits, sumDecimalAmounts } from "./decimalMoney";

function calculatePercentage(amount: number | string, totalAmount: number | string) {
    const totalUnits = decimalToUnits(totalAmount);
    if (totalUnits <= BigInt(0)) {
        return 0;
    }

    return Number((decimalToUnits(amount) * BigInt(10000) + totalUnits / BigInt(2)) / totalUnits) / 100;
}

export function buildPieChartItems(
    items: AccountBookRankingChartItem[],
    totalAmount: number | string,
    maxItems: number,
    othersName: string
): AccountBookRankingChartItem[] {
    if (items.length <= maxItems) {
        return items;
    }

    const visibleCount = Math.max(maxItems - 1, 1);
    const visibleItems = items.slice(0, visibleCount);
    const othersItems = items.slice(visibleCount);

    const othersAmount = sumDecimalAmounts(othersItems.map((item) => item.amount));

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
