import { decimalToUnits, unitsToDecimal } from "@/utils/account-book/decimalMoney";

export function calculateExpenseGoalStatus(
    goalAmount: number | string | null,
    expenseAmount: number | string
) {
    const goalUnits = decimalToUnits(goalAmount ?? 0);
    const expenseUnits = decimalToUnits(expenseAmount);
    const normalizedGoalAmount = unitsToDecimal(goalUnits);
    const hasGoal = goalUnits > BigInt(0);

    const usageRate = hasGoal
        ? Number((expenseUnits * BigInt(100) + goalUnits / BigInt(2)) / goalUnits)
        : 0;

    const progressRate = Math.min(usageRate, 100);
    const difference = goalUnits - expenseUnits;
    const remainingAmount = unitsToDecimal(difference > BigInt(0) ? difference : BigInt(0));
    const exceededAmount = unitsToDecimal(difference < BigInt(0) ? -difference : BigInt(0));
    const isExceeded = hasGoal && expenseUnits > goalUnits;

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
