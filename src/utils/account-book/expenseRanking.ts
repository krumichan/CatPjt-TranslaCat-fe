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

export type ExpenseRankingSelection = AccountBookRankingChartItem & {
    groupKeys: (string | null)[];
    excludedGroupKeys?: (string | null)[];
};

export function buildPieChartSelections(
    items: AccountBookRankingChartItem[],
    totalAmount: number | string,
    maxItems: number,
    othersName: string
): ExpenseRankingSelection[] {
    const visibleCount = Math.max(maxItems - 1, 1);

    // 표시명 대신 원래 집계 키를 보존해 실제 '기타'와 합산 항목을 구분한다.
    return buildPieChartItems(items, totalAmount, maxItems, othersName).map((item, index) => {
        const isCombined = items.length > maxItems && index === visibleCount;
        const members = isCombined
            ? items.slice(visibleCount)
            : [items[index]];
        const groupKey = (member: AccountBookRankingChartItem) => member.groupKey === undefined ? member.name : member.groupKey;

        return {
            ...item,
            groupKeys: members.map(groupKey),
            // 기타는 보이는 소수의 그룹을 제외해 매장이 많아도 요청이 커지지 않게 한다.
            ...(isCombined ? { excludedGroupKeys: items.slice(0, visibleCount).map(groupKey) } : {}),
        };
    });
}
