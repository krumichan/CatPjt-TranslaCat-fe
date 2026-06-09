import { useState } from "react";
import { List, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import ExpenseGoalEditModal from "@/components/account-book/detail/expense-goal/ExpenseGoalEditModal";
import ExpenseGoalEmptyState from "@/components/account-book/detail/expense-goal/ExpenseGoalEmptyState";
import ExpenseGoalProgress from "@/components/account-book/detail/expense-goal/ExpenseGoalProgress";
import ExpenseGoalSummaryGrid from "@/components/account-book/detail/expense-goal/ExpenseGoalSummaryGrid";
import { calculateExpenseGoalStatus } from "@/components/account-book/detail/expense-goal/expenseGoalUtils";
import ExpenseGoalListModal from "@/components/account-book/detail/transaction-list/ExpenseGoalListModal";

type AccountBookExpenseGoalCardProps = {
    accountBookId: number;
    selectedMonth: string;
    currencyCode: CurrencyCode;
    goalAmount: number | null;
    expenseAmount: number;
    isLoading?: boolean;
    errorMessage?: string | null;
    onSaveGoalAmount: (
        year: number,
        month: number,
        goalAmount: number
    ) => void | Promise<void>;
};

export default function AccountBookExpenseGoalCard({
   accountBookId,
   selectedMonth,
   currencyCode,
   goalAmount,
   expenseAmount,
   isLoading = false,
   errorMessage,
   onSaveGoalAmount,
}: AccountBookExpenseGoalCardProps) {
    const t = useTranslations("AccountBook.detail.expenseGoal");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isListModalOpen, setIsListModalOpen] = useState(false)
    const [shouldReopenListModal, setShouldReopenListModal] = useState(false);

    const [editingGoal, setEditingGoal] = useState<{
        year: number;
        month: number;
        goalAmount: number;
    } | null>(null);

    const {
        normalizedGoalAmount,
        hasGoal,
        usageRate,
        progressRate,
        remainingAmount,
        exceededAmount,
        isExceeded,
    } = calculateExpenseGoalStatus(goalAmount, expenseAmount);

    const isMonthSelected = selectedMonth !== "ALL";

    const closeEditModal = () => {
        setIsModalOpen(false);
        setEditingGoal(null);

        if (shouldReopenListModal) {
            setIsListModalOpen(true);
            setShouldReopenListModal(false);
        }
    };

    const saveGoalAmount = async (
        year: number,
        month: number,
        savedGoalAmount: number
    ) => {
        await onSaveGoalAmount(year, month, savedGoalAmount);

        setIsModalOpen(false);
        setEditingGoal(null);

        if (shouldReopenListModal) {
            setIsListModalOpen(true);
            setShouldReopenListModal(false);
        }
    };

    return (
        <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            {t("title")}
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {hasGoal
                                ? formatAmount(
                                    normalizedGoalAmount,
                                    currencyCode
                                )
                                : t("notSet")}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {!isMonthSelected
                                ? t("selectMonthGuide")
                                : hasGoal
                                    ? isExceeded
                                        ? t("exceeded", {
                                            amount: formatAmount(
                                                exceededAmount,
                                                currencyCode
                                            ),
                                        })
                                        : t("remaining", {
                                            amount: formatAmount(
                                                remainingAmount,
                                                currencyCode
                                            ),
                                        })
                                    : t("emptyGuide")}
                        </p>

                        {errorMessage && (
                            <p className="mt-2 text-sm font-medium text-red-500 dark:text-red-400">
                                {errorMessage}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsListModalOpen(true)}
                            disabled={isLoading}
                            className="rounded-full bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                            aria-label={t("actions.openList")}
                        >
                            <List size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setEditingGoal(null);
                                setShouldReopenListModal(false);
                                setIsModalOpen(true);
                            }}
                            disabled={isLoading || !isMonthSelected}
                            className="rounded-full bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                            aria-label={t("actions.open")}
                        >
                            <Pencil size={20} />
                        </button>
                    </div>
                </div>

                {hasGoal ? (
                    <>
                        <ExpenseGoalProgress
                            progressRate={progressRate}
                            usageRate={usageRate}
                            isExceeded={isExceeded}
                            usageRateLabel={t("usageRate")}
                        />

                        <ExpenseGoalSummaryGrid
                            currencyCode={currencyCode}
                            expenseAmount={expenseAmount}
                            remainingAmount={remainingAmount}
                            exceededAmount={exceededAmount}
                            isExceeded={isExceeded}
                            currentExpenseLabel={t("currentExpense")}
                            remainingAmountLabel={t("remainingAmount")}
                            exceededAmountLabel={t("exceededAmount")}
                        />
                    </>
                ) : (
                    <ExpenseGoalEmptyState
                        message={
                            isMonthSelected
                                ? t("noGoalMessage")
                                : t("selectMonthMessage")
                        }
                    />
                )}
            </div>

            {isModalOpen && (
                <ExpenseGoalEditModal
                    key={
                        editingGoal
                            ? `${editingGoal.year}-${editingGoal.month}-${editingGoal.goalAmount}`
                            : `${selectedMonth}-${goalAmount ?? "empty"}`
                    }
                    selectedMonth={
                        editingGoal
                            ? `${editingGoal.year}-${String(editingGoal.month).padStart(2, "0")}`
                            : selectedMonth
                    }
                    currencyCode={currencyCode}
                    initialGoalAmount={editingGoal ? editingGoal.goalAmount : goalAmount}
                    isSubmitting={isLoading}
                    onClose={closeEditModal}
                    onSave={saveGoalAmount}
                />
            )}

            {isListModalOpen && (
                <ExpenseGoalListModal
                    accountBookId={accountBookId}
                    currencyCode={currencyCode}
                    isSubmitting={isLoading}
                    onClose={() => setIsListModalOpen(false)}
                    onClickEdit={(year, month, goalAmount) => {
                        setEditingGoal({
                            year,
                            month,
                            goalAmount,
                        });
                        setShouldReopenListModal(true);
                        setIsListModalOpen(false);
                        setIsModalOpen(true);
                    }}
                />
            )}
        </>
    );
}