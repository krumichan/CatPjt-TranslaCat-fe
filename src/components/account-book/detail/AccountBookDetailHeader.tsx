import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
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
};

export default function AccountBookDetailHeader({
    accountBook,
    onClickCreateTransaction,
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

                <button
                    type="button"
                    onClick={onClickCreateTransaction}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 hover:shadow-[0_14px_28px_rgba(249,115,22,0.34)]"
                >
                    <Plus size={18} />
                    {t("createTransaction")}
                </button>
            </div>
        </div>
    );
}