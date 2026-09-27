import ExpenseGoalAmountInput from "@/components/account-book/detail/expense-goal/ExpenseGoalAmountInput";
import ExpenseGoalYearMonthInput from "@/components/account-book/detail/expense-goal/ExpenseGoalYearMonthInput";
import type { CurrencyCode } from "@/types/accountBook";
import { getDefaultYearMonth } from "@/utils/account-book/expenseGoalForm";
import { parsePositiveDecimalInput } from "@/utils/account-book/decimalInput";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SyntheticEvent } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

type ExpenseGoalEditModalProps = {
    selectedMonth: string;
    currencyCode: CurrencyCode;
    initialGoalAmount: number | string | null;
    isSubmitting?: boolean;
    onClose: () => void;
    onSave: (
        year: number,
        month: number,
        goalAmount: number | string
    ) => void | Promise<void>;
};

export default function ExpenseGoalEditModal({
    selectedMonth,
    currencyCode,
    initialGoalAmount,
    isSubmitting = false,
    onClose,
    onSave,
}: ExpenseGoalEditModalProps) {
    const t = useTranslations("AccountBook.detail.expenseGoal.modal");

    const initialYearMonth = getDefaultYearMonth(selectedMonth);

    const [targetYear, setTargetYear] = useState(initialYearMonth.year);
    const [targetMonth, setTargetMonth] = useState(initialYearMonth.month);
    const [goalAmount, setGoalAmount] = useState(
        initialGoalAmount ? String(initialGoalAmount) : ""
    );

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (targetYear.length !== 4) {
            alert(t("validation.targetYearRequired"));
            return;
        }

        const parsedYear = Number(targetYear);
        const parsedMonth = Number(targetMonth);

        if (
            Number.isNaN(parsedYear) ||
            parsedYear < 2000 ||
            parsedYear > 9999
        ) {
            alert(t("validation.targetYearRequired"));
            return;
        }

        if (
            Number.isNaN(parsedMonth) ||
            parsedMonth < 1 ||
            parsedMonth > 12
        ) {
            alert(t("validation.targetMonthRequired"));
            return;
        }

        const trimmedGoalAmount = goalAmount.trim();

        if (!trimmedGoalAmount) {
            alert(t("validation.required"));
            return;
        }

        const parsedGoalAmount = parsePositiveDecimalInput(trimmedGoalAmount);

        if (parsedGoalAmount === null) {
            alert(t("validation.positiveNumber"));
            return;
        }

        await onSave(parsedYear, parsedMonth, parsedGoalAmount);
    };

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto overscroll-contain px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
            <button
                type="button"
                aria-label={t("actions.close")}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {t("title")}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t("description", {
                                year: targetYear,
                                month: Number(targetMonth || 1),
                            })}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={t("actions.close")}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t("fields.targetMonth")}
                        </label>

                        <ExpenseGoalYearMonthInput
                            year={targetYear}
                            month={targetMonth}
                            yearSuffix={t("fields.yearSuffix")}
                            monthSuffix={t("fields.monthSuffix")}
                            onChangeYear={setTargetYear}
                            onChangeMonth={setTargetMonth}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t("fields.goalAmount")}
                        </label>

                        <ExpenseGoalAmountInput
                            currencyCode={currencyCode}
                            value={goalAmount}
                            placeholder={t("placeholders.goalAmount")}
                            onChange={setGoalAmount}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            {t("actions.cancel")}
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting
                                ? t("actions.saving")
                                : t("actions.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
