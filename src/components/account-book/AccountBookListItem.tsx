import Link from "next/link";
import { Pencil, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { AccountBook } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import {
    canDeleteAccountBook,
    canEditAccountBook,
    canManageAccountBookMembers,
} from "@/utils/account-book/accountBookPermission";

type AccountBookListItemProps = {
    accountBook: AccountBook;
    onEdit: (accountBook: AccountBook) => void | Promise<void>;
    onDelete: (accountBook: AccountBook) => void;
    onManageMembers: (accountBook: AccountBook) => void;
};

export default function AccountBookListItem({
    accountBook,
    onEdit,
    onDelete,
    onManageMembers,
}: AccountBookListItemProps) {
    const t = useTranslations("AccountBook.item");

    const canEdit = canEditAccountBook(accountBook);
    const canDelete = canDeleteAccountBook(accountBook);
    const canManageMembers = canManageAccountBookMembers(accountBook);

    const hasActions = canManageMembers || canEdit || canDelete;

    return (
        <article className="group relative rounded-2xl border border-slate-200 bg-slate-50/90 p-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50/80 hover:shadow-md dark:border-white/10 dark:bg-white/3 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10">
            {hasActions && (
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl bg-slate-100/70 p-1 backdrop-blur-sm dark:bg-white/5">
                    {canManageMembers && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onManageMembers(accountBook);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-orange-500 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-orange-300"
                            aria-label={t("manageMembersAria", {
                                name: accountBook.name,
                            })}
                            title={t("manageMembersAria", {
                                name: accountBook.name,
                            })}
                        >
                            <Users className="h-4 w-4" />
                        </button>
                    )}

                    {canEdit && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                void onEdit(accountBook);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-orange-500 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-orange-300"
                            aria-label={t("editAria", {
                                name: accountBook.name,
                            })}
                            title={t("editAria", {
                                name: accountBook.name,
                            })}
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                    )}

                    {canDelete && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete(accountBook);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 ring-1 ring-red-100 transition hover:bg-red-100 hover:text-red-600 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20 dark:hover:bg-red-500/20"
                            aria-label={t("deleteAria", {
                                name: accountBook.name,
                            })}
                            title={t("deleteAria", {
                                name: accountBook.name,
                            })}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            <Link
                href={`/account-books/${accountBook.id}`}
                className="block min-w-0 cursor-pointer"
            >
                <div className={hasActions ? "pr-28" : undefined}>
                    <h3 className="truncate text-lg font-black text-slate-900 dark:text-white">
                        {accountBook.name}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-orange-500">
                        {accountBook.currencySymbol
                            ? `${accountBook.currencyCode} ${accountBook.currencySymbol}`
                            : accountBook.currencyCode}
                    </p>
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
        </article>
    );
}