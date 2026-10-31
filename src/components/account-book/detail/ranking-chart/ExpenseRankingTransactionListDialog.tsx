"use client";

import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";

type Props = {
    title: string;
    summary: string;
    onClose: () => void;
    children: ReactNode;
};

export default function ExpenseRankingTransactionListDialog({ title, summary, onClose, children }: Props) {
    const t = useTranslations("AccountBook.detail.rankingChart.transactions");
    const dialogRef = useRef<HTMLElement>(null);
    const titleId = useId();
    useModalFocusTrap(true, dialogRef, onClose);

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto overscroll-contain px-2 py-3 sm:px-4 sm:py-10">
            <button type="button" aria-label={t("close")} onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
                data-testid="ranking-transactions-modal"
                className="relative mx-auto w-full min-w-0 max-w-5xl rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-zinc-900">
                <header className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 id={titleId} className="break-words text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                        <p className="mt-2 break-words text-sm text-slate-500 dark:text-slate-400">{summary}</p>
                    </div>
                    <button type="button" aria-label={t("close")} onClick={onClose}
                        className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
                        <X size={20} />
                    </button>
                </header>
                {children}
            </section>
        </div>,
        document.body
    );
}
