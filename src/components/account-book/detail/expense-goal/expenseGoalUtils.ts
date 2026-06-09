export function calculateExpenseGoalStatus(
    goalAmount: number | null,
    expenseAmount: number
) {
    const normalizedGoalAmount = goalAmount ?? 0;
    const hasGoal = normalizedGoalAmount > 0;

    const usageRate = hasGoal
        ? Math.round((expenseAmount / normalizedGoalAmount) * 100)
        : 0;

    const progressRate = Math.min(usageRate, 100);
    const remainingAmount = Math.max(normalizedGoalAmount - expenseAmount, 0);
    const exceededAmount = Math.max(expenseAmount - normalizedGoalAmount, 0);
    const isExceeded = hasGoal && expenseAmount > normalizedGoalAmount;

    return {
        normalizedGoalAmount,
        hasGoal,
        usageRate,
        progressRate,
        remainingAmount,
        exceededAmount,
        isExceeded,
    };
}

export function parseYearMonthValue(yearMonth: string) {
    const [year, month] = yearMonth.split("-").map(Number);

    return {
        year,
        month,
    };
}