import { useState } from "react";
import type { SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import {  Pencil, Target, X } from "lucide-react";
import { AccountBook } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type AccountBookExpenseGoalCardProps = {
    accountBook: AccountBook;
    onSaveGoalAmount: (goalAmount: number | null) => void | Promise<void>;
};

export default function AccountBookExpenseGoalCard({
   accountBook,
   onSaveGoalAmount,
}: AccountBookExpenseGoalCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const goalAmount = accountBook.expenseGoalAmount ?? 0;
    const expenseAmount = accountBook.expenseAmount ?? 0;

    const hasGoal = goalAmount > 0;
    const usageRate = hasGoal ? Math.round((expenseAmount / goalAmount) * 100) : 0;
    const progressRate = Math.min(usageRate, 100);

    const remainingAmount = Math.max(goalAmount - expenseAmount, 0);
    const exceededAmount = Math.max(expenseAmount - goalAmount, 0);
    const isExceeded = hasGoal && expenseAmount > goalAmount;

    return (
        <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            이번 달 지출 목표
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                            {hasGoal
                                ? formatAmount(goalAmount, accountBook.currencyCode)
                                : "목표 미설정"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {hasGoal
                                ? isExceeded
                                    ? `목표보다 ${formatAmount(
                                        exceededAmount,
                                        accountBook.currencyCode
                                    )} 초과했어요.`
                                    : `목표까지 ${formatAmount(
                                        remainingAmount,
                                        accountBook.currencyCode
                                    )} 남았어요.`
                                : "지출 목표를 설정하면 사용 현황을 확인할 수 있어요."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-full bg-slate-100 p-3 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                    >
                        <Pencil size={20} />
                    </button>
                </div>

                {hasGoal ? (
                    <>
                        <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-black/30">
                            <div
                                className={
                                    isExceeded
                                        ? "h-full rounded-full bg-red-500"
                                        : "h-full rounded-full bg-orange-400"
                                }
                                style={{ width: `${progressRate}%` }}
                            />
                        </div>

                        <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                사용률
              </span>

                            <span
                                className={
                                    isExceeded
                                        ? "font-bold text-red-500 dark:text-red-400"
                                        : "font-bold text-slate-900 dark:text-white"
                                }
                            >
                {usageRate}%
              </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-black/20">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    현재 지출
                                </p>
                                <p className="mt-1 truncate text-base font-bold text-red-500 dark:text-red-400">
                                    {formatAmount(expenseAmount, accountBook.currencyCode)}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-black/20">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {isExceeded ? "초과 금액" : "남은 금액"}
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
                                        accountBook.currencyCode
                                    )}
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                            <Target size={20} />
                            <p className="text-sm font-medium">
                                아직 목표 금액이 없습니다. 우측 버튼에서 목표를 설정해보세요.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <ExpenseGoalEditModal
                    accountBook={accountBook}
                    initialGoalAmount={accountBook.expenseGoalAmount ?? null}
                    onClose={() => setIsModalOpen(false)}
                    onSave={async (goalAmount) => {
                        await onSaveGoalAmount(goalAmount);
                        setIsModalOpen(false);
                    }}
                />
            )}
        </>
    );
}

type ExpenseGoalEditModalProps = {
    accountBook: AccountBook;
    initialGoalAmount: number | null;
    onClose: () => void;
    onSave: (goalAmount: number | null) => void | Promise<void>;
};

function ExpenseGoalEditModal({
  accountBook,
  initialGoalAmount,
  onClose,
  onSave,
}: ExpenseGoalEditModalProps) {
    const [goalAmount, setGoalAmount] = useState(
        initialGoalAmount ? String(initialGoalAmount) : ""
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        const trimmedGoalAmount = goalAmount.trim();

        if (!trimmedGoalAmount) {
            alert("목표 금액을 입력해줘.");
            return;
        }

        const parsedGoalAmount = Number(trimmedGoalAmount);

        if (Number.isNaN(parsedGoalAmount) || parsedGoalAmount <= 0) {
            alert("목표 금액은 0보다 큰 숫자로 입력해줘.");
            return;
        }

        try {
            setIsSubmitting(true);
            await onSave(parsedGoalAmount);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGoal = async () => {
        const confirmed = window.confirm("지출 목표를 삭제할까요?");

        if (!confirmed) {
            return;
        }

        try {
            setIsSubmitting(true);
            await onSave(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label="모달 닫기"
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            지출 목표 설정
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {accountBook.name}의 이번 달 지출 목표 금액을 설정합니다.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            목표 금액
                        </label>

                        <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:focus-within:ring-orange-500/20">
                            <div className="flex items-center border-r border-slate-300 px-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">
                                {accountBook.currencyCode}
                            </div>

                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={goalAmount}
                                onChange={(e) => setGoalAmount(e.target.value)}
                                placeholder="목표 금액 입력"
                                className="w-full bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                            취소
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? "저장 중..." : "저장"}
                        </button>
                    </div>

                    {initialGoalAmount && (
                        <button
                            type="button"
                            onClick={handleDeleteGoal}
                            disabled={isSubmitting}
                            className="w-full rounded-xl px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                            목표 금액 삭제
                        </button>
                    )}
                </form>
            </div>
        </div>,
        document.body
    );
}