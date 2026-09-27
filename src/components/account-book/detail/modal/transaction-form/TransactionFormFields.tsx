import { useTranslations } from "next-intl";
import { CurrencyCode, TransactionType } from "@/types/accountBook";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import { isPositiveDecimal } from "@/utils/account-book/decimalInput";
import {
    DIRECT_INPUT_VALUE,
    inputClassName,
    selectClassName,
} from "./constants";
import TransactionCategoryField from "./TransactionCategoryField";
import type { CategoryOptionsStatus } from "@/types/accountBookReceiptReview";

type TransactionFormFieldsProps = {
    currencyCode: CurrencyCode;
    type: TransactionType;
    conversionLocked?: boolean;
    title: string;
    onTitleChange: (value: string) => void;
    storeName: string;
    onStoreNameChange: (value: string) => void;
    directStoreName: string;
    onDirectStoreNameChange: (value: string) => void;
    storeNames: string[];
    isDirectStoreInput: boolean;
    categoryName: string;
    onCategoryNameChange: (value: string) => void;
    directCategoryName: string;
    onDirectCategoryNameChange: (value: string) => void;
    categoryNames: string[];
    isDirectCategoryInput: boolean;
    categoryOptionsStatus: CategoryOptionsStatus;
    onRetryCategories?: () => void;
    amount: string;
    onAmountChange: (value: string) => void;
    transactionDate: string;
    onTransactionDateChange: (value: string) => void;
    memo: string;
    onMemoChange: (value: string) => void;
};

export default function TransactionFormFields({
    currencyCode,
    type,
    conversionLocked,
    title,
    onTitleChange,
    storeName,
    onStoreNameChange,
    directStoreName,
    onDirectStoreNameChange,
    storeNames,
    isDirectStoreInput,
    categoryName,
    onCategoryNameChange,
    directCategoryName,
    onDirectCategoryNameChange,
    categoryNames,
    isDirectCategoryInput,
    categoryOptionsStatus,
    onRetryCategories,
    amount,
    onAmountChange,
    transactionDate,
    onTransactionDateChange,
    memo,
    onMemoChange,
}: TransactionFormFieldsProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const formatAmount = useAmountFormatter();

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="transaction-title"
                        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                        {t("fields.title")}
                        {" "}
                        <span className="text-orange-500">*</span>
                    </label>
                    <input
                        id="transaction-title"
                        value={title}
                        onChange={(event) => onTitleChange(event.target.value)}
                        placeholder={t("placeholders.title")}
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label
                        htmlFor="transaction-party"
                        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                        {t(type === "INCOME" ? "fields.incomeSource" : "fields.storeName")}
                    </label>
                    <select
                        id="transaction-party"
                        value={storeName}
                        onChange={(event) =>
                            onStoreNameChange(event.target.value)
                        }
                        className={selectClassName}
                    >
                        <option value="">
                            {t("options.storeNotSet")}
                        </option>

                        {storeName && storeName !== DIRECT_INPUT_VALUE && !storeNames.includes(storeName) && (
                            <option value={storeName}>{storeName} · {t("options.savedValue")}</option>
                        )}

                        {storeNames.map((store) => (
                            <option
                                key={store}
                                value={store}
                            >
                                {store}
                            </option>
                        ))}

                        <option value={DIRECT_INPUT_VALUE}>
                            {t("options.directInput")}
                        </option>
                    </select>

                    {isDirectStoreInput && (
                        <input
                            value={directStoreName}
                            onChange={(event) =>
                                onDirectStoreNameChange(event.target.value)
                            }
                            placeholder={t("placeholders.directStoreName")}
                            className={`${inputClassName} mt-3`}
                        />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TransactionCategoryField
                    id="transaction-category"
                    value={categoryName}
                    directValue={directCategoryName}
                    categoryNames={categoryNames}
                    status={categoryOptionsStatus}
                    error={(isDirectCategoryInput ? directCategoryName : categoryName).trim()
                        ? null : t("validation.categoryRequired")}
                    onChange={onCategoryNameChange}
                    onDirectChange={onDirectCategoryNameChange}
                    onRetry={onRetryCategories}
                />

                <div>
                    <label
                        htmlFor="transaction-amount"
                        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                        {t("fields.amount")}
                        {" "}
                        <span className="text-orange-500">*</span>
                    </label>
                    <input
                        id="transaction-amount"
                        value={amount}
                        disabled={conversionLocked}
                        onChange={(event) => onAmountChange(event.target.value)}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        placeholder="0"
                        className={inputClassName}
                    />

                    {isPositiveDecimal(amount) && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {t(
                                "fields.displayAmount",
                                {
                                    amount: formatAmount(
                                        amount,
                                        currencyCode
                                    ),
                                }
                            )}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <label
                    htmlFor="transaction-date"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                    {t("fields.transactionDate")}
                    {" "}
                    <span className="text-orange-500">*</span>
                </label>
                <input
                    id="transaction-date"
                    value={transactionDate}
                    disabled={conversionLocked}
                    onChange={(event) =>
                        onTransactionDateChange(event.target.value)
                    }
                    type="date"
                    className={inputClassName}
                />
            </div>

            <div>
                <label
                    htmlFor="transaction-memo"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                    {t("fields.memo")}
                </label>
                <textarea
                    id="transaction-memo"
                    value={memo}
                    onChange={(event) => onMemoChange(event.target.value)}
                    placeholder={t("placeholders.memo")}
                    rows={3}
                    className={`${inputClassName} resize-none`}
                />
            </div>
        </>
    );
}
