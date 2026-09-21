import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { TransactionFormModalProps } from "./transaction-form/types";
import { useTransactionFormModal } from "./transaction-form/useTransactionFormModal";
import TransactionInputModeTabs from "./transaction-form/TransactionInputModeTabs";
import ReceiptAnalysisPanel from "./transaction-form/ReceiptAnalysisPanel";
import TransactionTypeSelector from "./transaction-form/TransactionTypeSelector";
import TransactionFormFields from "./transaction-form/TransactionFormFields";
import TransactionFormActions from "./transaction-form/TransactionFormActions";
import ReceiptReviewList from "./transaction-form/ReceiptReviewList";

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

            <div role="dialog" aria-modal="true" aria-labelledby="transaction-form-title" className="relative z-10 mx-auto flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-2xl flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md sm:max-h-[calc(100dvh-6rem)] sm:p-6 dark:border-white/10 dark:bg-zinc-900/95">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="mb-1 text-sm font-medium text-orange-500">
                            {badge}
                        </p>
                        <h2 id="transaction-form-title" className="break-words text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
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
                        onChange={(mode) => { if (!isBlockingModal) form.setInputMode(mode); }}
                    />
                )}

                {showReceipt && (
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
                    />
                )}

                {showReceipt && (form.receiptReview.items.length > 0 || form.receiptReview.warnings.length > 0) && <ReceiptReviewList
                    review={form.receiptReview} categoryNames={form.categoryNames} onClose={onClose} />}

                {!showReceipt && <form
                    onSubmit={form.handleSubmit}
                    className="space-y-5"
                    aria-busy={form.isAnalyzingReceipt}
                >
                    <TransactionTypeSelector
                        type={form.type}
                        onChange={form.setType}
                        disabled={conversionLocked}
                    />

                    {conversionLocked && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{t("receipt.review.conversionLocked")}</p>}

                    <TransactionFormFields
                        currencyCode={currencyCode}
                        conversionLocked={conversionLocked}
                        title={form.title}
                        onTitleChange={form.setTitle}
                        storeName={form.storeName}
                        onStoreNameChange={form.setStoreName}
                        directStoreName={form.directStoreName}
                        onDirectStoreNameChange={form.setDirectStoreName}
                        storeNames={form.storeNames}
                        isDirectStoreInput={form.isDirectStoreInput}
                        categoryName={form.categoryName}
                        onCategoryNameChange={form.setCategoryName}
                        directCategoryName={form.directCategoryName}
                        onDirectCategoryNameChange={form.setDirectCategoryName}
                        categoryNames={form.categoryNames}
                        isDirectCategoryInput={form.isDirectCategoryInput}
                        amount={form.amount}
                        onAmountChange={form.setAmount}
                        transactionDate={form.transactionDate}
                        onTransactionDateChange={form.setTransactionDate}
                        memo={form.memo}
                        onMemoChange={form.setMemo}
                    />

                    <TransactionFormActions
                        canSubmit={form.canSubmit}
                        isSubmitting={form.isSubmitting}
                        isAnalyzingReceipt={form.isAnalyzingReceipt}
                        submitLabel={submitLabel}
                        onClose={onClose}
                    />
                </form>}

            </div>
        </div>,
        document.body
    );
}
