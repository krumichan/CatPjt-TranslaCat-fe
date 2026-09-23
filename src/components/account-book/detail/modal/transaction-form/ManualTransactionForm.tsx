import { useTranslations } from "next-intl";
import type { CurrencyCode } from "@/types/accountBook";
import type { TransactionFormController } from "@/hooks/account-book/detail/transaction/useTransactionFormModal";
import TransactionTypeSelector from "./TransactionTypeSelector";
import TransactionFormFields from "./TransactionFormFields";
import TransactionFormActions from "./TransactionFormActions";

type Props = {
    form: TransactionFormController;
    currencyCode: CurrencyCode;
    conversionLocked: boolean;
    submitLabel: string;
    onClose: () => void;
};

export default function ManualTransactionForm({ form, currencyCode, conversionLocked, submitLabel, onClose }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    return (
        <form
            onSubmit={form.handleSubmit}
            className="space-y-5 overflow-y-auto"
            aria-busy={form.isAnalyzingReceipt}
        >
            <TransactionTypeSelector
                type={form.type}
                onChange={form.setType}
                disabled={conversionLocked}
            />

            {conversionLocked && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    {t("receipt.review.conversionLocked")}
                </p>
            )}

            <TransactionFormFields
                currencyCode={currencyCode}
                type={form.type}
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
                categoryOptionsStatus={form.categoryOptionsStatus}
                onRetryCategories={form.onRetryCategories}
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
    );
}
