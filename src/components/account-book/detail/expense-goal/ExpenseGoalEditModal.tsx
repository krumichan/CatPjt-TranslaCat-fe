import { useState } from "react";
import type { SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { CurrencyCode } from "@/types/accountBook";
import { parseCommaNumber } from "@/utils/number/formatNumberInput";
import ExpenseGoalYearMonthInput from "@/components/account-book/detail/expense-goal/ExpenseGoalYearMonthInput";
import ExpenseGoalAmountInput from "@/components/account-book/detail/expense-goal/ExpenseGoalAmountInput";

type ExpenseGoalEditModalProps = {
    selectedMonth: string;
    currencyCode: CurrencyCode;
    initialGoalAmount: number | null;
    isSubmitting?: boolean;
    onClose: () => void;
    onSave: (
        year: number,
        month: number,
        goalAmount: number
    ) => void | Promise<void>;
};

function getDefaultYearMonth(selectedMonth: string) {
    if (selectedMonth === "ALL") {
        const now = new Date();

        return {
            year: String(now.getFullYear()),
            month: String(now.getMonth() + 1).padStart(2, "0"),
        };
    }

    const [year, month] = selectedMonth.split("-");

    return {
        year,
        month,
    };
}

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
        initialGoalAmount ? initialGoalAmount.toLocaleString()  : ""
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

        const parsedGoalAmount = parseCommaNumber(trimmedGoalAmount);

        if (Number.isNaN(parsedGoalAmount) || parsedGoalAmount <= 0) {
            alert(t("validation.positiveNumber"));
            return;
        }

        await onSave(parsedYear, parsedMonth, parsedGoalAmount);
    };

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label={t("actions.close")}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
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