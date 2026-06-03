import { AccountBookFixedExpense, CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type FixedExpenseSectionProps = {
    fixedExpenses: AccountBookFixedExpense[];
    currencyCode: CurrencyCode;
    onClickCreateFixedExpense: () => void;
};

export default function FixedExpenseSection({
    fixedExpenses,
    currencyCode,
    onClickCreateFixedExpense,
}: FixedExpenseSectionProps) {
    return (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        고정비용
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        매월 반복되는 지출을 등록해둘 수 있어요
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        등록된 고정비용 {fixedExpenses.length}건
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClickCreateFixedExpense}
                    className="shrink-0 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600"
                >
                    고정비용 등록
                </button>
            </div>

            {fixedExpenses.length > 0 && (
                <div className="mt-4 space-y-2">
                    {fixedExpenses.map((fixedExpense) => (
                        <div
                            key={fixedExpense.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-black/20"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                        {fixedExpense.title}
                                    </p>

                                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {fixedExpense.categoryName}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    매월 {fixedExpense.paymentDay}일
                                    {fixedExpense.storeName
                                        ? ` · ${fixedExpense.storeName}`
                                        : ""}
                                </p>
                            </div>

                            <p className="shrink-0 text-sm font-bold text-red-500 dark:text-red-400">
                                -{formatAmount(fixedExpense.amount, currencyCode)}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}