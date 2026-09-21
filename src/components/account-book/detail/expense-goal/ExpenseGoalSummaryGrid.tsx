import { CurrencyCode } from "@/types/accountBook";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";

type ExpenseGoalSummaryGridProps = {
    currencyCode: CurrencyCode;
    expenseAmount: number | string;
    remainingAmount: number | string;
    exceededAmount: number | string;
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
    const formatAmount = useAmountFormatter();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-black/20">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {currentExpenseLabel}
                </p>
                <p className="mt-1 break-all text-base font-bold text-red-500 dark:text-red-400">
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
                            ? "mt-1 break-all text-base font-bold text-red-500 dark:text-red-400"
                            : "mt-1 break-all text-base font-bold text-blue-600 dark:text-blue-400"
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
