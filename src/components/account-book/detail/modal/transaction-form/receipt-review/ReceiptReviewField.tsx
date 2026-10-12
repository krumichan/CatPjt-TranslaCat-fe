import { useTranslations } from "next-intl";
import {
    editReceiptReview,
    classifyReceiptInlineAmountEdit,
    type ReceiptEditableField,
    type ReceiptRegistrationValidation,
    type ReceiptReviewItem,
} from "@/utils/account-book/receiptReview";
import { receiptFieldId } from "@/utils/account-book/receiptReviewPresentation";
import TransactionField from "../TransactionField";
import { inputClassName } from "../constants";

type Props = {
    item: ReceiptReviewItem;
    field: ReceiptEditableField;
    label: string;
    options?: {
        type?: string;
        inputMode?: "decimal";
        maxLength?: number;
    };
    validation: ReceiptRegistrationValidation;
    onChange: (item: ReceiptReviewItem) => void;
};

export default function ReceiptReviewField({ item, field, label, options = {}, validation, onChange }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const id = receiptFieldId(item.clientId, field);
    const issue = validation.blockingIssues.find((entry) => entry.field === field);
    const error = issue ? t(`receipt.review.blockingIssues.${issue.code}`) : null;
    const amountPolicy = field === "originalAmount" ? classifyReceiptInlineAmountEdit(item) : null;
    const derivedAmount = amountPolicy?.mode === "DETAILS_REQUIRED";
    const amountHint = amountPolicy ? t(derivedAmount
        ? "receipt.review.derivedAmountHint"
        : amountPolicy.mode === "SINGLE_PAYMENT" ? "receipt.review.inlineAmountSinglePaymentScope" : "receipt.review.inlineAmountSimpleScope") : null;
    const required = !["memo", "storeName", "branchName", "cashTendered", "change", "transactionTime"].includes(field);

    return (
        <TransactionField
            id={id}
            label={label}
            required={required}
            error={error}
            hint={amountHint}
        >
            <input
                id={id}
                {...options}
                value={item[field] ?? ""}
                readOnly={derivedAmount}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : amountHint ? `${id}-hint` : undefined}
                onChange={(event) => onChange(editReceiptReview(
                    item,
                    field,
                    event.target.value
                ))}
                className={inputClassName}
            />
            {derivedAmount && (
                <button type="button" className="mt-1 text-xs font-semibold text-orange-700 underline dark:text-orange-300"
                    onClick={(event) => {
                        const details = event.currentTarget.closest("article")?.querySelector("details");
                        if (details) details.open = true;
                        document.getElementById(receiptFieldId(item.clientId, "paymentBreakdown"))?.focus();
                    }}>
                    {t("receipt.review.receiptDetails")}
                </button>
            )}
        </TransactionField>
    );
}
