import { useTranslations } from "next-intl";
import type { ReceiptReviewContentProps } from "./types";

type Props = ReceiptReviewContentProps & {
    onClose: () => void;
};

export default function ReceiptReviewFooter({ review, controller, onClose }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { hasAmountEdit } = controller;
    return (
        <footer className="shrink-0 space-y-2 border-t border-slate-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 dark:border-white/10 dark:bg-zinc-900/95">
            <p
                className="text-xs text-slate-600 dark:text-slate-300"
                aria-live="polite"
            >
                {t("receipt.review.selectionSummary", review.selectionSummary)}
            </p>
            {hasAmountEdit && (
                <p
                    role="status"
                    className="text-xs font-semibold text-amber-700 dark:text-amber-300"
                >
                    {t("receipt.review.inlineAmountPending")}
                </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={review.isBusy}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:text-slate-300"
                >
                    {t("actions.cancel")}
                </button>
                <button
                    type="button"
                    data-testid="receipt-submit-selected"
                    onClick={() => void review.submit()}
                    disabled={!review.canSubmit || review.isBusy || hasAmountEdit}
                    className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                    {review.isSubmitting ? t("actions.submitting") : t("receipt.review.register", { count: review.selectedCount })}
                </button>
            </div>
        </footer>
    );
}
