import { useId } from "react";
import { useTranslations } from "next-intl";
import { hasValidReceiptFields, hasValidReceiptSource, type ReceiptEditableField, type ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import { inputClassName } from "./constants";
import ReceiptWarnings from "./ReceiptWarnings";

type Props = {
    item: ReceiptReviewItem;
    index: number;
    categoryNames: string[];
    disabled: boolean;
    previewing: boolean;
    onSelect: (selected: boolean) => void;
    onEdit: (field: ReceiptEditableField, value: string) => void;
    onPreview: () => void;
};

export default function ReceiptReviewCard({ item, index, categoryNames, disabled, previewing, onSelect, onEdit, onPreview }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const id = useId();
    const conversion = item.conversion;
    const warnings = [...new Set([...item.analysisWarnings, ...(conversion.warnings ?? [])])];
    const input = (field: ReceiptEditableField, label: string, options: { type?: string; inputMode?: "decimal"; maxLength?: number; list?: string } = {}) => (
        <label className="block min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
            <input {...options} value={item[field] ?? ""} onChange={(event) => onEdit(field, event.target.value)}
                className={inputClassName} required={!['memo', 'storeName'].includes(field)} />
        </label>
    );

    return (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-white/10 dark:bg-zinc-900" data-testid="receipt-review-card">
            <label className="mb-4 flex min-w-0 items-start gap-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <input type="checkbox" checked={item.selected} disabled={disabled} onChange={(event) => onSelect(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500" />
                <span className="min-w-0 break-words">{t("receipt.review.receiptNumber", { index: index + 1 })}</span>
            </label>
            <fieldset disabled={disabled} className="min-w-0 space-y-3 disabled:opacity-70">
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    {input("storeName", t("fields.storeName"), { maxLength: 100 })}
                    {input("title", t("fields.title"), { maxLength: 100 })}
                    {input("categoryName", t("fields.category"), { list: `${id}-categories`, maxLength: 50 })}
                    {input("transactionDate", t("fields.transactionDate"), { type: "date" })}
                    {input("originalAmount", t("receipt.review.originalAmount"), { inputMode: "decimal" })}
                    {input("originalCurrencyCode", t("receipt.review.originalCurrency"), { maxLength: 3 })}
                </div>
                <datalist id={`${id}-categories`}>{categoryNames.map((name) => <option key={name} value={name} />)}</datalist>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("receipt.review.categoryHint")}</p>
                <label className="block min-w-0">
                    <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{t("fields.memo")}</span>
                    <textarea value={item.memo ?? ""} onChange={(event) => onEdit("memo", event.target.value)} rows={2} maxLength={500} className={`${inputClassName} resize-y`} />
                </label>
            </fieldset>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="min-w-0"><dt>{t("receipt.review.convertedAmount")}</dt><dd className="break-all text-base font-bold text-slate-900 dark:text-white">{conversion.convertedAmount ?? "—"} {conversion.accountBookCurrencyCode}</dd></div>
                    <div className="min-w-0"><dt>{t("receipt.review.exchangeRate")}</dt><dd className="break-words">{conversion.exchangeRate ? `1 ${item.originalCurrencyCode} = ${conversion.exchangeRate} ${conversion.accountBookCurrencyCode}` : "—"}</dd></div>
                    <div><dt>{t("receipt.review.requestedDate")}</dt><dd>{conversion.requestedRateDate ?? "—"}</dd></div>
                    <div><dt>{t("receipt.review.effectiveDate")}</dt><dd>{conversion.effectiveRateDate ?? "—"}</dd></div>
                    <div className="min-w-0"><dt>{t("receipt.review.provider")}</dt><dd className="break-all">{conversion.exchangeRateProvider ?? "—"}</dd></div>
                    <div><dt>{t("receipt.review.confidence")}</dt><dd>{item.confidence == null ? "—" : `${Math.round(Math.max(0, Math.min(1, item.confidence)) * 100)}%`}</dd></div>
                    {item.detectedLanguage && <div className="min-w-0"><dt>{t("receipt.review.language")}</dt><dd className="break-all">{item.detectedLanguage}</dd></div>}
                </dl>
                <p>{t(`receipt.review.conversionStatuses.${conversion.conversionStatus}`)}</p>
                {conversion.rateDateFallback && <p className="text-amber-700 dark:text-amber-300">{t("receipt.review.dateFallback")}</p>}
            </div>

            {item.status !== "READY" && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t(`receipt.review.analysisStatuses.${item.status}`)}</p>}
            <ReceiptWarnings warnings={warnings} />
            {item.conversionStale && <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300" role="status">{t("receipt.review.staleConversion")}</p>}
            {!hasValidReceiptFields(item) && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t("receipt.review.requiredFields")}</p>}

            <button type="button" data-testid={`receipt-recalculate-${item.receiptId}`} disabled={disabled || !hasValidReceiptSource(item)} onClick={onPreview}
                className="mt-3 w-full rounded-xl border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-orange-300">
                {t(previewing ? "receipt.review.previewing" : "receipt.review.preview")}
            </button>
        </article>
    );
}
