"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type TransactionMemoTextProps = {
    memo?: string | null;
};

export default function TransactionMemoText({ memo }: TransactionMemoTextProps) {
    const t = useTranslations("AccountBook.detail.transactionList.memo");
    const [isExpanded, setIsExpanded] = useState(false);

    if (!memo) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="mt-1 block w-full text-left text-xs text-slate-400 transition hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400"
        >
            <span
                className={
                    isExpanded
                        ? "block whitespace-pre-wrap wrap-break-word"
                        : "block truncate"
                }
            >
                {memo}
            </span>

            {memo.length > 30 && (
                <span className="mt-1 block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {isExpanded ? t("collapse") : t("expand")}
                </span>
            )}
        </button>
    );
}