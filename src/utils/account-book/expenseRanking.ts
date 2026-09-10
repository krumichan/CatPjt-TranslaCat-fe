import type { AccountBookRankingChartItem } from "@/types/accountBook";

function calculatePercentage(amount: number, totalAmount: number) {
    if (totalAmount <= 0) {
        return 0;
    }

    return Number(((amount / totalAmount) * 100).toFixed(2));
}

export function buildPieChartItems(
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
