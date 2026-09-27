import { useTranslations } from "next-intl";
import ReceiptWarnings from "../ReceiptWarnings";
import type { ReceiptReviewContentProps } from "./types";

export default function ReceiptReviewHeader({ review, controller }: ReceiptReviewContentProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { viewMode, setViewMode } = controller;
    return (
        <header className="shrink-0 space-y-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {t("receipt.review.title")}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("receipt.review.description")}
                    </p>
                </div>
                <div
                    className="inline-flex rounded-xl border border-slate-200 p-1 dark:border-white/10"
                    aria-label={t("receipt.review.viewMode")}
                >
                    {(["LIST", "TABLE"] as const).map((mode) => (
                        <button
                            type="button"
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            aria-pressed={viewMode === mode}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${viewMode === mode ? "bg-orange-500 text-white" : "text-slate-500 dark:text-slate-300"}`}
                        >
                            {t(`receipt.review.viewModes.${mode.toLowerCase()}`)}
                        </button>
                    ))}
                </div>
            </div>
            <ReceiptWarnings warnings={review.warnings} />
        </header>
    );
}
