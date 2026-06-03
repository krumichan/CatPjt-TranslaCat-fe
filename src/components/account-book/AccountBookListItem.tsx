import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { AccountBook } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type AccountBookListItemProps = {
    accountBook: AccountBook;
    onDelete: (accountBookId: string) => void;
};

export default function AccountBookListItem({
    accountBook,
    onDelete,
}: AccountBookListItemProps) {
    return (
        <div className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/90 p-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50/80 hover:shadow-md dark:border-white/10 dark:bg-black/25 dark:hover:border-orange-400/60 dark:hover:bg-zinc-900/80">
            <Link
                href={`/account-books/${accountBook.id}`}
                className="min-w-0 flex-1"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold">
                                {accountBook.name}
                            </h3>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {accountBook.currencyCode}
                            </span>
                        </div>

                        {accountBook.description && (
                            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                {accountBook.description}
                            </p>
                        )}

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
                            <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-slate-500 dark:bg-white/5 dark:text-slate-400 sm:block">
                                <span className="sm:mb-0.5 sm:block">수입</span>
                                <strong className="text-blue-600 dark:text-blue-400">
                                    {formatAmount(accountBook.incomeAmount, accountBook.currencyCode)}
                                </strong>
                            </div>

                            <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-slate-500 dark:bg-white/5 dark:text-slate-400 sm:block">
                                <span className="sm:mb-0.5 sm:block">지출</span>
                                <strong className="text-red-500 dark:text-red-400">
                                    {formatAmount(accountBook.expenseAmount, accountBook.currencyCode)}
                                </strong>
                            </div>

                            <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-slate-500 dark:bg-white/5 dark:text-slate-400 sm:block">
                                <span className="sm:mb-0.5 sm:block">잔액</span>
                                <strong className="text-slate-800 dark:text-slate-200">
                                    {formatAmount(accountBook.balance, accountBook.currencyCode)}
                                </strong>
                            </div>

                            <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-slate-500 dark:bg-white/5 dark:text-slate-400 sm:block">
                                <span className="sm:mb-0.5 sm:block">거래</span>
                                <strong className="text-slate-800 dark:text-slate-200">
                                    {accountBook.transactionCount ?? 0}건
                                </strong>
                            </div>
                        </div>
                    </div>

                    <ChevronRight
                        size={20}
                        className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-orange-500"
                    />
                </div>
            </Link>

            <button
                type="button"
                onClick={() => onDelete(accountBook.id)}
                className="ml-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                aria-label={`${accountBook.name} 삭제`}
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
}