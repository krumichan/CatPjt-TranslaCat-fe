import ManualTransactionForm from "./transaction-form/ManualTransactionForm";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { TransactionFormModalProps } from "@/types/accountBookTransactionForm";
import { useTransactionFormModal } from "@/hooks/account-book/detail/transaction/useTransactionFormModal";
import TransactionInputModeTabs from "./transaction-form/TransactionInputModeTabs";
import ReceiptAnalysisPanel from "./transaction-form/ReceiptAnalysisPanel";
import ReceiptReviewSmartSection from "./transaction-form/ReceiptReviewSmartSection";

export default function TransactionFormModal(props: TransactionFormModalProps) {
    const {
        isOpen,
        transaction,
        currencyCode,
        onClose,
        onAnalyzeReceipt,
    } = props;

    const t = useTranslations("AccountBook.detail.transactionModal");
    const form = useTransactionFormModal(props);

    useEffect(
        () => {
            if (!isOpen || typeof document === "undefined")
                return;
            const previous = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = previous;
            };
        },
        [isOpen]
    );

    const isCreateMode = form.isCreateMode;
    const isEditMode = form.isEditMode;

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    if (isEditMode && !transaction) {
        return null;
    }

    const badge = isCreateMode ? t("badge.create") : t("badge.edit");
    const modalTitle = isCreateMode ? t("title.create") : t("title.edit");
    const description = isCreateMode
        ? t("description.create")
        : t("description.edit");
    const submitLabel = isCreateMode
        ? t("actions.create")
        : t("actions.save");

    const isBlockingModal = form.isAnalyzingReceipt || form.isSubmitting || form.receiptReview.isBusy;
    const showReceipt = isCreateMode && form.inputMode === "RECEIPT";
    const conversionLocked = isEditMode && transaction?.originalAmount != null;

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-2 py-3 sm:px-4 sm:py-12">
            <button
                type="button"
                aria-label={t("actions.close")}
                onClick={() => {
                    if (!isBlockingModal) {
                        onClose();
                    }
                }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div
                id="transaction-form-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="transaction-form-title"
                className="relative z-10 mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md sm:max-h-[calc(100dvh-6rem)] sm:p-6 dark:border-white/10 dark:bg-zinc-900/95"
            >
                <div className="mb-3 flex shrink-0 items-start justify-between gap-4 sm:mb-5">
                    <div className="min-w-0">
                        <p className="mb-1 text-sm font-medium text-orange-500">
                            {badge}
                        </p>
                        <h2
                            id="transaction-form-title"
                            className="break-words text-xl font-bold text-gray-900 sm:text-2xl dark:text-white"
                        >
                            {modalTitle}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {description}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isBlockingModal}
                        aria-label={t("actions.close")}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isCreateMode && (
                    <TransactionInputModeTabs
                        inputMode={form.inputMode}
                        onChange={(mode) => {
                            if (!isBlockingModal)
                                form.setInputMode(mode);
                        }}
                    />
                )}

                {showReceipt && (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                        <ReceiptAnalysisPanel
                            receiptQueue={form.receiptQueue}
                            receiptAnalysisMode={form.receiptAnalysisMode}
                            receiptAnalysisMessage={form.receiptAnalysisMessage}
                            isAnalyzingReceipt={form.isAnalyzingReceipt}
                            disabled={isBlockingModal}
                            canAnalyzeReceipt={form.receiptQueue.some((item) => item.status === "queued") && !!onAnalyzeReceipt && !form.receiptReview.isBusy}
                            onAnalysisModeChange={form.setReceiptAnalysisMode}
                            onFilesChange={(files) => {
                                form.addReceiptFiles(files);
                                form.setReceiptAnalysisMessage(null);
                            }}
                            onRemove={form.removeReceiptFile}
                            onCancel={form.cancelReceiptAnalysis}
                            onRetry={(sourceImageId) => void form.retryReceiptAnalysis(sourceImageId)}
                            onAnalyzeReceipt={form.handleAnalyzeReceipt}
                            reviewAssisted={form.receiptReview.reviewAssisted}
                            onAddMissingReceipt={form.receiptReview.addManualCandidate}
                        />

                        {(form.receiptReview.items.length > 0 || form.receiptReview.warnings.length > 0) && (
                            <ReceiptReviewSmartSection
                                review={form.receiptReview}
                                categoryNames={form.categoryNames}
                                categoryStatus={form.categoryOptionsStatus}
                                onRetryCategories={form.onRetryCategories}
                                sourcePreviews={form.receiptQueue.map((item) => ({
                                    sourceImageId: item.sourceImageId,
                                    previewUrl: item.previewUrl,
                                    fileName: item.file.name,
                                }))}
                                onClose={onClose}
                            />
                        )}
                    </div>
                )}

                {!showReceipt && (
                    <ManualTransactionForm
                        form={form}
                        currencyCode={currencyCode}
                        conversionLocked={conversionLocked}
                        submitLabel={submitLabel}
                        onClose={onClose}
                    />
                )}

            </div>
        </div>,
        document.body
    );
}
