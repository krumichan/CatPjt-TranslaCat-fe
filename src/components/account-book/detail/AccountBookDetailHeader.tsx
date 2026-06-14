import Link from "next/link";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { CurrencyCode } from "@/types/accountBook";

type AccountBookDetailHeaderData = {
    id: number;
    name: string;
    description?: string | null;
    currencyCode: CurrencyCode;
};

type AccountBookDetailHeaderProps = {
    accountBook: AccountBookDetailHeaderData;
    onClickCreateTransaction: () => void;
    canManageMembers?: boolean;
    onClickManageMembers?: () => void;
};

export default function AccountBookDetailHeader({
    accountBook,
    onClickCreateTransaction,
    canManageMembers = false,
    onClickManageMembers,
}: AccountBookDetailHeaderProps) {
    const t = useTranslations("AccountBook.detail.header");

    return (
        <div className="mb-6">
            <Link
                href="/account-books"
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400"
            >
                <ArrowLeft size={18} />
                {t("backToList")}
            </Link>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-orange-500">
                        {t("eyebrow")}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            {accountBook.name}
                        </h1>

                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                            {accountBook.currencyCode}
                        </span>
                    </div>

                    {accountBook.description && (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {accountBook.description}
                        </p>
                    )}
                </div>

                <div className="flex w-full items-center gap-2 md:w-auto md:justify-end">
                    <button
                        type="button"
                        onClick={onClickCreateTransaction}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 hover:shadow-[0_14px_28px_rgba(249,115,22,0.34)] md:flex-none"
                    >
                        <Plus className="h-4 w-4" />
                        {t("createTransaction")}
                    </button>

                    {canManageMembers && onClickManageMembers && (
                        <button
                            type="button"
                            onClick={onClickManageMembers}
                            className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 text-white/80 backdrop-blur transition hover:border-orange-300/60 hover:bg-orange-500/15 hover:text-orange-200 md:w-auto md:px-4 dark:border-white/10 dark:bg-white/5"
                            aria-label={t("manageMembers")}
                            title={t("manageMembers")}
                        >
                            <Users className="h-4 w-4" />
                            <span className="hidden md:inline">
                                {t("manageMembers")}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}