import { useTranslations } from "next-intl";
import type { AccountBookTransaction } from "@/types/accountBook";

export default function TransactionConversionDetails({ transaction }: { transaction: AccountBookTransaction }) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    if (transaction.originalAmount == null || !transaction.originalCurrencyCode) return null;
    const rows = [
        [t("originalAmount"), `${transaction.originalAmount} ${transaction.originalCurrencyCode}`],
        [t("exchangeRate"), transaction.exchangeRate],
        [t("requestedDate"), transaction.requestedRateDate],
        [t("effectiveDate"), transaction.effectiveRateDate],
        [t("provider"), transaction.exchangeRateProvider],
        [t("rateFetchedAt"), transaction.rateFetchedAt],
        [t("convertedAt"), transaction.convertedAt],
        [t("roundingPolicy"), transaction.roundingMode && transaction.roundingPrecision != null
            ? `${transaction.roundingMode} / ${transaction.roundingPrecision} / ${transaction.conversionPolicyVersion ?? "—"}`
            : null],
    ];
    return (
        <details className="mt-2 min-w-0 max-w-full break-words text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer break-all font-medium">
                {t("originalAmount")}: {transaction.originalAmount} {transaction.originalCurrencyCode}
            </summary>
            <dl className="mt-2 grid min-w-0 gap-1">
                {rows.filter(([, value]) => value != null).map(([label, value]) => (
                    <div key={label} className="flex min-w-0 flex-wrap gap-x-2">
                        <dt>{label}</dt><dd className="min-w-0 break-all font-medium">{value}</dd>
                    </div>
                ))}
            </dl>
        </details>
    );
}
