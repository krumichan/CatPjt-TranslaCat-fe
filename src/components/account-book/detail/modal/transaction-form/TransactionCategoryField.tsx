import { useTranslations } from "next-intl";
import { DIRECT_INPUT_VALUE, inputClassName, selectClassName } from "./constants";
import TransactionField from "./TransactionField";

import type { CategoryOptionsStatus } from "@/types/accountBookReceiptReview";

type Props = {
    id: string;
    value: string;
    directValue: string;
    categoryNames: string[];
    status: CategoryOptionsStatus;
    error?: string | null;
    disabled?: boolean;
    onChange: (value: string) => void;
    onDirectChange: (value: string) => void;
    onRetry?: () => void;
};

export default function TransactionCategoryField({
    id,
    value,
    directValue,
    categoryNames,
    status,
    error,
    disabled,
    onChange,
    onDirectChange,
    onRetry,
}: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const isDirect = value === DIRECT_INPUT_VALUE;
    const savedValue = value && value !== DIRECT_INPUT_VALUE && !categoryNames.includes(value) ? value : null;
    const describedBy = error ? `${id}-error` : status !== "ready" ? `${id}-status` : undefined;
    return (
        <TransactionField
            id={id}
            label={t("fields.category")}
            required
            error={error}
        >
            <select
                id={id}
                value={value}
                disabled={disabled || status === "loading"}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                onChange={(event) => onChange(event.target.value)}
                className={selectClassName}
            >
                <option value="">
                    {t("options.categoryNotSelected")}
                </option>
                {savedValue && (
                    <option value={savedValue}>{savedValue} · {t("options.savedValue")}</option>
                )}
                {categoryNames.map((category) => (
                    <option
                        key={category}
                        value={category}
                    >
                        {category}
                    </option>
                ))}
                <option value={DIRECT_INPUT_VALUE}>
                    {t("options.directInput")}
                </option>
            </select>
            {isDirect && (
                <input
                    id={`${id}-direct`}
                    value={directValue}
                    disabled={disabled}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    onChange={(event) => onDirectChange(event.target.value)}
                    placeholder={t("placeholders.directCategoryName")}
                    maxLength={50}
                    className={`${inputClassName} mt-3`}
                />
            )}
            {status !== "ready" && (
                <div
                    id={`${id}-status`}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                >
                    <span>
                        {t(`categoryStatus.${status}`)}
                    </span>
                    {status === "error" && onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="font-semibold text-orange-600 underline underline-offset-2 dark:text-orange-300"
                        >
                            {t("categoryStatus.retry")}
                        </button>
                    )}
                </div>
            )}
        </TransactionField>
    );
}
