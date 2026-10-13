import { useTranslations } from "next-intl";
import type { ReceiptReviewContentProps } from "./types";

export default function ReceiptReviewHeader({ controller }: ReceiptReviewContentProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { viewMode, setViewMode } = controller;
    return (
        <header className="shrink-0 border-b border-slate-200 pb-2 sm:pb-3 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 sm:flex-wrap sm:items-start sm:gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold sm:text-lg text-slate-900 dark:text-white">
                        {t("receipt.review.title")}
                    </h3>
                    <p className="mt-1 hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                        {t("receipt.review.description")}
                    </p>
                </div>
                <div
                    className="inline-flex shrink-0 rounded-xl border border-slate-200 p-1 dark:border-white/10"
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
        </header>
    );
}
