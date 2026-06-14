import { useTranslations } from "next-intl";
import { CurrencyCode } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import {
    DIRECT_INPUT_VALUE,
    inputClassName,
    selectClassName,
} from "./constants";

type TransactionFormFieldsProps = {
    currencyCode: CurrencyCode;

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

    amount: string;
    onAmountChange: (value: string) => void;

    transactionDate: string;
    onTransactionDateChange: (value: string) => void;

    memo: string;
    onMemoChange: (value: string) => void;
};

export default function TransactionFormFields({
    currencyCode,
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
    amount,
    onAmountChange,
    transactionDate,
    onTransactionDateChange,
    memo,
    onMemoChange,
}: TransactionFormFieldsProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t("fields.title")}{" "}
                        <span className="text-orange-500">*</span>
                    </label>
                    <input
                        value={title}
                        onChange={(event) => onTitleChange(event.target.value)}
                        placeholder={t("placeholders.title")}
                        className={inputClassName}
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t("fields.storeName")}
                    </label>
                    <select
                        value={storeName}
                        onChange={(event) =>
                            onStoreNameChange(event.target.value)
                        }
                        className={selectClassName}
                    >
                        <option value="">{t("options.storeNotSet")}</option>

                        {storeNames.map((store) => (
                            <option key={store} value={store}>
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
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t("fields.category")}{" "}
                        <span className="text-orange-500">*</span>
                    </label>
                    <select
                        value={categoryName}
                        onChange={(event) =>
                            onCategoryNameChange(event.target.value)
                        }
                        className={selectClassName}
                    >
                        {categoryNames.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}

                        <option value={DIRECT_INPUT_VALUE}>
                            {t("options.directInput")}
                        </option>
                    </select>

                    {isDirectCategoryInput && (
                        <input
                            value={directCategoryName}
                            onChange={(event) =>
                                onDirectCategoryNameChange(event.target.value)
                            }
                            placeholder={t("placeholders.directCategoryName")}
                            className={`${inputClassName} mt-3`}
                        />
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t("fields.amount")}{" "}
                        <span className="text-orange-500">*</span>
                    </label>
                    <input
                        value={amount}
                        onChange={(event) => onAmountChange(event.target.value)}
                        type="number"
                        min="0"
                        inputMode="numeric"
                        placeholder="0"
                        className={inputClassName}
                    />

                    {Number(amount) > 0 && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {t("fields.displayAmount", {
                                amount: formatAmount(
                                    Number(amount),
                                    currencyCode
                                ),
                            })}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("fields.transactionDate")}{" "}
                    <span className="text-orange-500">*</span>
                </label>
                <input
                    value={transactionDate}
                    onChange={(event) =>
                        onTransactionDateChange(event.target.value)
                    }
                    type="date"
                    className={inputClassName}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("fields.memo")}
                </label>
                <textarea
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