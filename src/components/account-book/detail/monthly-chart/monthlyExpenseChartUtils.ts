import { AccountBookMonthlyChartItem } from "@/types/accountBook";

export type MonthlyExpenseChartRow = AccountBookMonthlyChartItem & {
    monthLabel: string;
};

export function getBudgetDiff(row: MonthlyExpenseChartRow) {
    if (row.expenseGoalAmount == null) {
        return null;
    }

    return row.expenseAmount - row.expenseGoalAmount;
}

export function getLatestBudgetStatusItem(data: MonthlyExpenseChartRow[]) {
    if (data.length === 0) {
        return null;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const chartYear = data[0]?.year;

    const targetData = data.filter((item) => {
        if (chartYear < currentYear) {
            return true;
        }

        if (chartYear > currentYear) {
            return true;
        }

        return item.month <= currentMonth;
    });

    const candidates = targetData.length > 0 ? targetData : data;

    return (
        [...candidates]
            .reverse()
            .find(
                (item) =>
                    item.expenseAmount > 0 ||
                    item.incomeAmount > 0 ||
                    item.expenseGoalAmount != null
            ) ?? candidates[candidates.length - 1] ?? null
    );
}

export function hasMonthlyChartData(data: MonthlyExpenseChartRow[]) {
    return data.some(
        (item) =>
            item.incomeAmount > 0 ||
            item.expenseAmount > 0 ||
            item.balance !== 0 ||
            item.expenseGoalAmount != null
    );
}