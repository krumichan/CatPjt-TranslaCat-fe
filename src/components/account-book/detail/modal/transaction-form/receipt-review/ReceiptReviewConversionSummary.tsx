import { useTranslations } from "next-intl";
import type { ReceiptReviewItem } from "@/utils/account-book/receiptReview";

type Props = {
    item: ReceiptReviewItem;
};

export default function ReceiptReviewConversionSummary({ item }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const conversion = item.conversion;
    return (
        <>
            <div className="mt-4 rounded-xl bg-orange-50 p-3 dark:bg-orange-500/10">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                    {t("receipt.review.bookAmount")}
                </p>
                <p className="break-all text-lg font-bold text-orange-800 dark:text-orange-200">{item.originalAmount || "—"} {item.originalCurrencyCode}</p>
                <p className="mt-1 break-words text-[11px] text-orange-700/80 dark:text-orange-300/80">
                    {item.amountReason}
                </p>
            </div>

            <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                        <dt>
                            {t("receipt.review.convertedAmount")}
                        </dt>
                        <dd className="break-all text-base font-bold text-slate-900 dark:text-white">{conversion.convertedAmount ?? "—"} {conversion.accountBookCurrencyCode}</dd>
                    </div>
                    <div>
                        <dt>
                            {t("receipt.review.exchangeRate")}
                        </dt>
                        <dd className="break-all">
                            {conversion.exchangeRate ? `1 ${item.originalCurrencyCode} = ${conversion.exchangeRate} ${conversion.accountBookCurrencyCode}` : "—"}
                        </dd>
                    </div>
                    <div>
                        <dt>
                            {t("receipt.review.requestedDate")}
                        </dt>
                        <dd>
                            {conversion.requestedRateDate ?? "—"}
                        </dd>
                    </div>
                    <div>
                        <dt>
                            {t("receipt.review.effectiveDate")}
                        </dt>
                        <dd>
                            {conversion.effectiveRateDate ?? "—"}
                        </dd>
                    </div>
                    <div>
                        <dt>
                            {t("receipt.review.provider")}
                        </dt>
                        <dd className="break-all">
                            {conversion.exchangeRateProvider ?? "—"}
                        </dd>
                    </div>
                    <div>
                        <dt>
                            {t("receipt.review.rateFetchedAt")}
                        </dt>
                        <dd className="break-all">
                            {conversion.rateFetchedAt ?? "—"}
                        </dd>
                    </div>
                    <div>
                        <dt>
                            {t("receipt.review.convertedAt")}
                        </dt>
                        <dd className="break-all">
                            {conversion.convertedAt ?? "—"}
                        </dd>
                    </div>
                    <div>
                        <dt>
                            {t("receipt.review.roundingPolicy")}
                        </dt>
                        <dd className="break-all">{conversion.roundingMode} / {conversion.roundingPrecision} / {conversion.conversionPolicyVersion}</dd>
                    </div>
                </dl>
            </div>

        </>
    );
}
