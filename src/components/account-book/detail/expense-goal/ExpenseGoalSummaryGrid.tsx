import { CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type ExpenseGoalSummaryGridProps = {
    currencyCode: CurrencyCode;
    expenseAmount: number;
    remainingAmount: number;
    exceededAmount: number;
    isExceeded: boolean;
    currentExpenseLabel: string;
    remainingAmountLabel: string;
    exceededAmountLabel: string;
};

export default function ExpenseGoalSummaryGrid({
   currencyCode,
   expenseAmount,
   remainingAmount,
   exceededAmount,
   isExceeded,
   currentExpenseLabel,
   remainingAmountLabel,
   exceededAmountLabel,
}: ExpenseGoalSummaryGridProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-black/20">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {currentExpenseLabel}
                </p>
                <p className="mt-1 truncate text-base font-bold text-red-500 dark:text-red-400">
                    {formatAmount(expenseAmount, currencyCode)}
                </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 dark:bg-black/20">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {isExceeded ? exceededAmountLabel : remainingAmountLabel}
                </p>

                <p
                    className={
                        isExceeded
                            ? "mt-1 truncate text-base font-bold text-red-500 dark:text-red-400"
                            : "mt-1 truncate text-base font-bold text-blue-600 dark:text-blue-400"
                    }
                >
                    {formatAmount(
                        isExceeded ? exceededAmount : remainingAmount,
                        currencyCode
                    )}
                </p>
            </div>
        </div>
    );
}