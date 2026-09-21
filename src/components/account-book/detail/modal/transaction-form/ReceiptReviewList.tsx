import { useTranslations } from "next-intl";
import ReceiptReviewCard from "./ReceiptReviewCard";
import type { useReceiptReview } from "./useReceiptReview";
import ReceiptWarnings from "./ReceiptWarnings";

type Props = { review: ReturnType<typeof useReceiptReview>; categoryNames: string[]; onClose: () => void };

export default function ReceiptReviewList({ review, categoryNames, onClose }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    return (
        <section className="min-w-0 space-y-4" aria-label={t("receipt.review.title")} data-testid="receipt-review-list">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("receipt.review.title")}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("receipt.review.description")}</p>
            </div>
            <ReceiptWarnings warnings={review.warnings} />
            {review.items.map((item, index) => <ReceiptReviewCard key={item.clientId} item={item} index={index}
                categoryNames={categoryNames} disabled={review.isBusy} previewing={review.previewingId === item.clientId}
                onSelect={(selected) => review.select(item.clientId, selected)}
                onEdit={(field, value) => review.edit(item.clientId, field, value)}
                onEditPayment={(paymentIndex, amount) => review.editPayment(item.clientId, paymentIndex, amount)}
                onPreview={() => void review.preview(item.clientId)} />)}
            {review.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{review.error}</p>}
            <div className="sticky bottom-0 space-y-2 border-t border-slate-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 dark:border-white/10 dark:bg-zinc-900/95">
                <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{t("receipt.review.selected", { count: review.selectedCount, total: review.items.length })}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={review.isBusy} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:text-slate-300">{t("actions.cancel")}</button>
                    <button type="button" data-testid="receipt-submit-selected" onClick={() => void review.submit()} disabled={!review.canSubmit || review.isBusy} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">
                        {review.isSubmitting ? t("actions.submitting") : t("receipt.review.register", { count: review.selectedCount })}
                    </button>
                </div>
            </div>
        </section>
    );
}
