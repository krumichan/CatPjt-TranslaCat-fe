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

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label={t("actions.close")}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="mb-1 text-sm font-medium text-orange-500">
                            {badge}
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {modalTitle}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {description}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isCreateMode && (
                    <TransactionInputModeTabs
                        inputMode={form.inputMode}
                        onChange={form.setInputMode}
                    />
                )}

                {isCreateMode && form.inputMode === "RECEIPT" && (
                    <ReceiptAnalysisPanel
                        receiptFile={form.receiptFile}
                        receiptAnalysisMessage={form.receiptAnalysisMessage}
                        isAnalyzingReceipt={form.isAnalyzingReceipt}
                        canAnalyzeReceipt={
                            !!form.receiptFile && !!onAnalyzeReceipt
                        }
                        onFileChange={(file) => {
                            form.setReceiptFile(file);
                            form.setReceiptAnalysisMessage(null);
                        }}
                        onAnalyzeReceipt={form.handleAnalyzeReceipt}
                    />
                )}

                <form onSubmit={form.handleSubmit} className="space-y-5">
                    <TransactionTypeSelector
                        type={form.type}
                        onChange={form.setType}
                    />

                    <TransactionFormFields
                        currencyCode={currencyCode}
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
                </form>
            </div>
        </div>,
        document.body
    );
}