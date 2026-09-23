import ReceiptReviewConversionSummary from "./receipt-review/ReceiptReviewConversionSummary";
import ReceiptReviewField from "./receipt-review/ReceiptReviewField";
import { receiptFieldId } from "@/utils/account-book/receiptReviewPresentation";
import { useTranslations } from "next-intl";
import {
    completeReceiptReview,
    editReceiptCategorySelection,
    editReceiptDirectCategory,
    editReceiptPayment,
    editReceiptReview,
    hasValidReceiptSource,
    omitReceiptBranch,
    RECEIPT_DIRECT_CATEGORY,
    type ReceiptBlockingField,
    type ReceiptRegistrationValidation,
    type ReceiptReviewItem,
} from "@/utils/account-book/receiptReview";
import { inputClassName } from "./constants";
import ReceiptWarnings from "./ReceiptWarnings";
import TransactionCategoryField from "./TransactionCategoryField";
import type { CategoryOptionsStatus } from "@/types/accountBookReceiptReview";
import TransactionField from "./TransactionField";
import type { ReceiptCategoryOption } from "@/types/accountBook";
import ReceiptSourcePreview from "./ReceiptSourcePreview";

type Props = {
    item: ReceiptReviewItem;
    index: number;
    categoryOptions: ReceiptCategoryOption[];
    categoryStatus: CategoryOptionsStatus;
    disabled: boolean;
    previewing: boolean;
    validation: ReceiptRegistrationValidation;
    onChange: (item: ReceiptReviewItem) => void;
    onPreview: (item: ReceiptReviewItem) => void;
    onApply: () => void;
    onCancel: () => void;
    onRetryCategories?: () => void;
    applyDisabled?: boolean;
    sourcePreviewUrl?: string;
};

export default function ReceiptReviewCard({
    item,
    index,
    categoryOptions,
    categoryStatus,
    disabled,
    previewing,
    validation,
    onChange,
    onPreview,
    onApply,
    onCancel,
    onRetryCategories,
    applyDisabled = false,
    sourcePreviewUrl = "",
}: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const issue = (field: ReceiptBlockingField) => validation.blockingIssues.find((entry) => entry.field === field);

    const error = (field: ReceiptBlockingField) => {
        const entry = issue(field);
        return entry ? t(`receipt.review.blockingIssues.${entry.code}`) : null;
    };

    return (
        <article
            className="min-w-0 rounded-2xl border border-orange-200 bg-white p-3 sm:p-4 dark:border-orange-500/30 dark:bg-zinc-900"
            data-testid="receipt-review-editor"
        >
            <div className="mb-4">
                <h4 className="font-bold text-slate-900 dark:text-white">
                    {t("receipt.review.editTitle", { index: index + 1 })}
                </h4>
                <p className="mt-1 break-words text-[11px] text-slate-500">{item.sourceFileName} · r{item.analysisRevision}</p>
            </div>
            {item.reviewMode === "ASSISTED" && (
                <ReceiptSourcePreview
                    previewUrl={sourcePreviewUrl}
                    sourceRegion={item.sourceRegion}
                    fileName={item.sourceFileName}
                />
            )}
            <fieldset
                disabled={disabled}
                className="min-w-0 space-y-4 disabled:opacity-70"
            >
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReceiptReviewField
                        item={item}
                        field="title"
                        label={t("fields.title")}
                        options={{ maxLength: 100 }}
                        validation={validation}
                        onChange={onChange}
                    />
                    <ReceiptReviewField
                        item={item}
                        field="storeName"
                        label={t("fields.storeName")}
                        options={{ maxLength: 100 }}
                        validation={validation}
                        onChange={onChange}
                    />
                    <TransactionCategoryField
                        id={receiptFieldId(item.clientId, "categoryName")}
                        value={item.categorySelection}
                        directValue={item.directCategoryName}
                        categoryNames={categoryOptions.map((option) => option.name)}
                        status={categoryStatus}
                        error={error("categoryName")}
                        onChange={(value) => {
                            const source = categoryOptions.find((option) => option.name === value)?.source ?? "USER";
                            onChange(editReceiptCategorySelection(
                                item,
                                value === "__DIRECT_INPUT__" ? RECEIPT_DIRECT_CATEGORY : value,
                                source
                            ));
                        }}
                        onDirectChange={(value) => onChange(editReceiptDirectCategory(item, value))}
                        onRetry={onRetryCategories}
                    />
                    <ReceiptReviewField
                        item={item}
                        field="originalAmount"
                        label={t("receipt.review.bookAmount")}
                        options={{ inputMode: "decimal" }}
                        validation={validation}
                        onChange={onChange}
                    />
                    <ReceiptReviewField
                        item={item}
                        field="transactionDate"
                        label={t("fields.transactionDate")}
                        options={{ type: "date" }}
                        validation={validation}
                        onChange={onChange}
                    />
                    <div className="sm:col-span-2">
                        <TransactionField
                            id={receiptFieldId(item.clientId, "memo")}
                            label={t("fields.memo")}
                            error={error("memo")}
                        >
                            <textarea
                                id={receiptFieldId(item.clientId, "memo")}
                                value={item.memo ?? ""}
                                rows={3}
                                maxLength={500}
                                aria-invalid={Boolean(error("memo"))}
                                onChange={(event) => onChange(editReceiptReview(
                                    item,
                                    "memo",
                                    event.target.value
                                ))}
                                className={`${inputClassName} resize-y`}
                            />
                        </TransactionField>
                    </div>
                </div>

                <details className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t("receipt.review.receiptDetails")}
                    </summary>
                    <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <ReceiptReviewField
                                item={item}
                                field="branchName"
                                label={t("receipt.review.branchName")}
                                options={{ maxLength: 100 }}
                                validation={validation}
                                onChange={onChange}
                            />
                            {item.reviewMode === "ASSISTED" && (
                                <button
                                    type="button"
                                    onClick={() => onChange(omitReceiptBranch(item))}
                                    className="mt-1 text-xs font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300"
                                >
                                    {t(item.branchOmittedByUser ? "receipt.review.branchOmitted" : "receipt.review.omitBranch")}
                                </button>
                            )}
                        </div>
                        <ReceiptReviewField
                            item={item}
                            field="transactionTime"
                            label={t("receipt.review.transactionTime")}
                            options={{ type: "time" }}
                            validation={validation}
                            onChange={onChange}
                        />
                        <ReceiptReviewField
                            item={item}
                            field="purchaseTotal"
                            label={t("receipt.review.purchaseTotal")}
                            options={{ inputMode: "decimal" }}
                            validation={validation}
                            onChange={onChange}
                        />
                        <ReceiptReviewField
                            item={item}
                            field="originalCurrencyCode"
                            label={t("receipt.review.originalCurrency")}
                            options={{ maxLength: 3 }}
                            validation={validation}
                            onChange={onChange}
                        />
                        <ReceiptReviewField
                            item={item}
                            field="cashTendered"
                            label={t("receipt.review.cashTendered")}
                            options={{ inputMode: "decimal" }}
                            validation={validation}
                            onChange={onChange}
                        />
                        <ReceiptReviewField
                            item={item}
                            field="change"
                            label={t("receipt.review.change")}
                            options={{ inputMode: "decimal" }}
                            validation={validation}
                            onChange={onChange}
                        />
                    </div>
                    {item.paymentBreakdown.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                {t("receipt.review.paymentBreakdown")}
                            </p>
                            {item.paymentBreakdown.map((payment, paymentIndex) => {
                                const id = paymentIndex === 0 ? receiptFieldId(item.clientId, "paymentBreakdown") : `${receiptFieldId(item.clientId, "paymentBreakdown")}-${paymentIndex}`;
                                return (
                                    <label
                                        key={`${payment.paymentType}-${paymentIndex}`}
                                        htmlFor={id}
                                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7rem,0.7fr)] items-end gap-2"
                                    >
                                        <span className="min-w-0 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="block font-semibold">
                                                {t(`receipt.review.paymentTypes.${payment.paymentType}`)}
                                            </span>
                                            <span
                                                className="block truncate"
                                                title={payment.evidence ?? ""}
                                            >
                                                {payment.evidence ?? "—"}
                                            </span>
                                        </span>
                                        <input
                                            id={id}
                                            value={payment.amount}
                                            inputMode="decimal"
                                            aria-invalid={Boolean(error("paymentBreakdown"))}
                                            onChange={(event) => onChange(editReceiptPayment(
                                                item,
                                                paymentIndex,
                                                event.target.value
                                            ))}
                                            className={inputClassName}
                                        />
                                    </label>
                                );
                            })}
                            {error("paymentBreakdown") && (
                                <p
                                    role="alert"
                                    className="text-xs font-semibold text-red-600 dark:text-red-300"
                                >
                                    {error("paymentBreakdown")}
                                </p>
                            )}
                        </div>
                    )}
                </details>
            </fieldset>

            <ReceiptReviewConversionSummary item={item} />

            <ReceiptWarnings warnings={validation.advisoryWarnings} />
            {validation.blockingIssues.length > 0 && (
                <ul
                    className="mt-3 space-y-1"
                    aria-label={t("receipt.review.currentIssues")}
                >
                    {validation.blockingIssues.map((entry) => (
                        <li
                            key={`${entry.code}-${entry.field}`}
                            className="text-xs font-semibold text-red-600 dark:text-red-300"
                        >
                            {t(`receipt.review.blockingIssues.${entry.code}`)}
                        </li>
                    ))}
                </ul>
            )}
            {item.conversionStale && (
                <p
                    className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300"
                    role="status"
                >
                    {t("receipt.review.staleConversion")}
                </p>
            )}
            <button
                id={receiptFieldId(item.clientId, "conversion")}
                type="button"
                data-testid={`receipt-recalculate-${item.receiptId}`}
                disabled={disabled || !hasValidReceiptSource(item)}
                onClick={() => onPreview(item)}
                className="mt-3 w-full rounded-xl border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-orange-300"
            >
                {t(previewing ? "receipt.review.previewing" : "receipt.review.preview")}
            </button>
            {item.reviewMode === "ASSISTED" && (
                <button
                    id={receiptFieldId(item.clientId, "review")}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(completeReceiptReview(item))}
                    className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm font-semibold ${item.reviewedRevision === item.draftRevision
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-blue-300 text-blue-700 dark:text-blue-300"}`}
                >
                    {t(item.reviewedRevision === item.draftRevision ? "receipt.review.sourceReviewed" : "receipt.review.confirmSourceReview")}
                </button>
            )}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={disabled}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                    {t("receipt.review.discardChanges")}
                </button>
                <button
                    type="button"
                    onClick={onApply}
                    disabled={disabled || applyDisabled}
                    className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {t("receipt.review.applyChanges")}
                </button>
            </div>
        </article>
    );
}
