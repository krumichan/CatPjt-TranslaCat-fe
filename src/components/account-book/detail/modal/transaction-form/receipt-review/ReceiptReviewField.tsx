import { useTranslations } from "next-intl";
import {
    editReceiptReview,
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
    const required = !["memo", "storeName", "branchName", "cashTendered", "change", "transactionTime"].includes(field);

    return (
        <TransactionField
            id={id}
            label={label}
            required={required}
            error={error}
        >
            <input
                id={id}
                {...options}
                value={item[field] ?? ""}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => onChange(editReceiptReview(
                    item,
                    field,
                    event.target.value
                ))}
                className={inputClassName}
            />
        </TransactionField>
    );
}
