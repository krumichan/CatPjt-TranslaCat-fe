import { useTranslations } from "next-intl";
import { editReceiptPayment, type ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import { receiptFieldId } from "@/utils/account-book/receiptReviewPresentation";
import type { ReceiptPaymentType } from "@/types/accountBook";
import { inputClassName } from "../constants";

const paymentTypes: ReceiptPaymentType[] = [
    "LOYALTY_POINTS", "CASH", "CREDIT_CARD", "DEBIT_CARD", "ELECTRONIC_MONEY",
    "GIFT_CARD", "VOUCHER", "OTHER_PAID", "UNKNOWN",
];

type Props = {
    item: ReceiptReviewItem;
    error: string | null;
    onChange: (item: ReceiptReviewItem) => void;
};

export default function ReceiptReviewPaymentFields({ item, error, onChange }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const baseId = receiptFieldId(item.clientId, "paymentBreakdown");
    if (!item.paymentBreakdown.length)
        return null;

    return (
        <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t("paymentBreakdown")}</p>
            <p id={`${baseId}-hint`} className="text-xs text-slate-600 dark:text-slate-300">{t("paymentCorrectionHint")}</p>
            {item.paymentBreakdown.map((payment, index) => {
                const id = index === 0 ? baseId : `${baseId}-${index}`;
                const observed = item.observedPaymentTypes?.[index];
                return (
                    <div key={index} className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-2 dark:border-white/10">
                        <label htmlFor={`${id}-type`} className="min-w-0 text-xs text-slate-600 dark:text-slate-300">
                            {t("paymentTypeLabel", { index: index + 1 })}
                            <select id={`${id}-type`} value={payment.paymentType} className={`${inputClassName} mt-1`}
                                aria-describedby={`${baseId}-hint`}
                                onChange={(event) => onChange(editReceiptPayment(item, index, payment.amount, event.target.value as ReceiptPaymentType))}>
                                {paymentTypes.map(type => <option key={type} value={type}>
                                    {t(type === "OTHER_PAID" ? "otherPaidWithPrepayment" : `paymentTypes.${type}`)}
                                </option>)}
                            </select>
                        </label>
                        <label htmlFor={id} className="min-w-0 text-xs text-slate-600 dark:text-slate-300">
                            {t("paymentAmountLabel", { index: index + 1 })} ({item.originalCurrencyCode})
                            <input id={id} value={payment.amount} inputMode="decimal" aria-invalid={Boolean(error)}
                                aria-describedby={error ? `${baseId}-error` : undefined}
                                onChange={(event) => onChange(editReceiptPayment(item, index, event.target.value))}
                                className={`${inputClassName} mt-1`} />
                        </label>
                        <p className="min-w-0 break-words text-[11px] text-slate-500 sm:col-span-2">
                            {payment.evidence ?? "—"}
                            {observed && observed !== payment.paymentType && <span className="block text-orange-700 dark:text-orange-300">
                                {t("observedPaymentType", { type: t(`paymentTypes.${observed}`) })}
                            </span>}
                        </p>
                    </div>
                );
            })}
            {error && <p id={`${baseId}-error`} role="alert" className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}
        </div>
    );
}
