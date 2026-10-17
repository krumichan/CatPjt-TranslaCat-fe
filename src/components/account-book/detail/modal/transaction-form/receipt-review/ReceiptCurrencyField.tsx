import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useReceiptCurrencyOptions } from "@/hooks/account-book/detail/receipt/useReceiptCurrencyOptions";
import { editReceiptReview, type ReceiptReviewItem, type ReceiptRegistrationValidation } from "@/utils/account-book/receiptReview";
import { receiptFieldId } from "@/utils/account-book/receiptReviewPresentation";
import TransactionField from "../TransactionField";
import { DIRECT_INPUT_VALUE, inputClassName, selectClassName } from "../constants";

type Props = {
    item: ReceiptReviewItem;
    validation: ReceiptRegistrationValidation;
    onChange: (item: ReceiptReviewItem) => void;
};

export default function ReceiptCurrencyField({ item, validation, onChange }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const locale = useLocale();
    const { currencies, isLoading, failed, retry } = useReceiptCurrencyOptions();
    const [directInput, setDirectInput] = useState(false);
    const id = receiptFieldId(item.clientId, "originalCurrencyCode");
    const issue = validation.blockingIssues.find((entry) => entry.field === "originalCurrencyCode");
    const error = issue ? t(`receipt.review.blockingIssues.${issue.code}`) : null;
    const savedCode = item.originalCurrencyCode && !currencies.some((currency) => currency.code === item.originalCurrencyCode)
        ? item.originalCurrencyCode : null;
    const status = isLoading ? "loading" : failed ? "error" : currencies.length === 0 ? "empty" : null;
    const describedBy = [error ? `${id}-error` : null, status ? `${id}-status` : null].filter(Boolean).join(" ") || undefined;
    const currencyName = (code: string, fallback = code) => {
        try {
            return new Intl.DisplayNames([locale === "learning" ? "ja" : locale], { type: "currency" }).of(code) ?? fallback;
        } catch {
            return fallback;
        }
    };

    return (
        <TransactionField id={id} label={t("receipt.review.originalCurrency")} required error={error}>
            <select
                id={id}
                value={directInput ? DIRECT_INPUT_VALUE : item.originalCurrencyCode}
                required
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                aria-busy={isLoading}
                data-receipt-initial-focus={error ? true : undefined}
                onChange={(event) => {
                    const value = event.target.value;
                    setDirectInput(value === DIRECT_INPUT_VALUE);
                    if (value !== DIRECT_INPUT_VALUE)
                        onChange(editReceiptReview(item, "originalCurrencyCode", value));
                }}
                className={selectClassName}
            >
                <option value="">{t("receipt.review.currencySelect")}</option>
                {savedCode && <option value={savedCode}>{savedCode} · {currencyName(savedCode)}</option>}
                {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                        {currency.code} · {currencyName(currency.code, currency.name)}
                    </option>
                ))}
                <option value={DIRECT_INPUT_VALUE}>{t("options.directInput")}</option>
            </select>
            {/* 후보 조회 실패나 목록에 없는 통화도 입력할 수 있다. 확정은 기존 서버 환산으로 검증한다. */}
            {directInput && (
                <input
                    id={`${id}-direct`}
                    aria-label={t("receipt.review.originalCurrency")}
                    value={item.originalCurrencyCode}
                    maxLength={3}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="JPY / KRW / USD"
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    onChange={(event) => onChange(editReceiptReview(item, "originalCurrencyCode", event.target.value))}
                    className={`${inputClassName} mt-2`}
                />
            )}
            {status && (
                <div id={`${id}-status`} role="status" className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{t(`receipt.review.currencyStatus.${status}`)}</span>
                    {failed && <button type="button" onClick={retry} className="font-semibold text-orange-600 underline dark:text-orange-300">
                        {t("categoryStatus.retry")}
                    </button>}
                </div>
            )}
        </TransactionField>
    );
}
