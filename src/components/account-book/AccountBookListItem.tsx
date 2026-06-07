import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AccountBook } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type AccountBookListItemProps = {
    accountBook: AccountBook;
    onDelete: (accountBookId: number) => void;
};

export default function AccountBookListItem({
    accountBook,
    onDelete,
}: AccountBookListItemProps) {
    const t = useTranslations("AccountBook.item");

    return (
        <article className="group flex items-stretch justify-between rounded-2xl border border-slate-200 bg-slate-50/90 p-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50/80 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10">
            <Link
                href={`/account-books/${accountBook.id}`}
                className="min-w-0 flex-1"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-slate-900 dark:text-white">
                            {accountBook.name}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-orange-500">
                            {accountBook.currencySymbol
                                ? `${accountBook.currencyCode} ${accountBook.currencySymbol}`
                                : accountBook.currencyCode}
                        </p>
                    </div>

                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-orange-400" />
                </div>

                {accountBook.description && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {accountBook.description}
                    </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                        <p className="text-slate-400">{t("income")}</p>
                        <p className="mt-1 font-bold text-emerald-500">
                            {formatAmount(
                                accountBook.incomeAmount,
                                accountBook.currencyCode
                            )}
                        </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                        <p className="text-slate-400">{t("expense")}</p>
                        <p className="mt-1 font-bold text-rose-500">
                            {formatAmount(
                                accountBook.expenseAmount,
                                accountBook.currencyCode
                            )}
                        </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                        <p className="text-slate-400">{t("balance")}</p>
                        <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">
                            {formatAmount(
                                accountBook.balance,
                                accountBook.currencyCode
                            )}
                        </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                        <p className="text-slate-400">{t("transactions")}</p>
                        <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">
                            {t("transactionCount", {
                                count: accountBook.transactionCount ?? 0,
                            })}
                        </p>
                    </div>
                </div>
            </Link>

            <button
                type="button"
                onClick={() => onDelete(accountBook.id)}
                className="ml-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                aria-label={t("deleteAria", { name: accountBook.name })}
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </article>
    );
}