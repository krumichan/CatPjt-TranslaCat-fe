import { useTranslations } from "next-intl";

type TransactionFormActionsProps = {
    canSubmit: boolean;
    isSubmitting: boolean;
    isAnalyzingReceipt: boolean;
    submitLabel: string;
    onClose: () => void;
};

export default function TransactionFormActions({
    canSubmit,
    isSubmitting,
    isAnalyzingReceipt,
    submitLabel,
    onClose,
}: TransactionFormActionsProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    return (
        <div className="flex justify-end gap-3 pt-2">
            <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
                {t("actions.cancel")}
            </button>

            <button
                type="submit"
                disabled={!canSubmit || isSubmitting || isAnalyzingReceipt}
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
            >
                {isSubmitting ? t("actions.submitting") : submitLabel}
            </button>
        </div>
    );
}