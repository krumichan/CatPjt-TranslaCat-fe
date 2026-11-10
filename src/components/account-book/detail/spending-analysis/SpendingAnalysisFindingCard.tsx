import { useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import type { SpendingAnalysisFinding } from "@/types/accountBookAnalysis";
import type { CurrencyCode } from "@/types/accountBook";
import SpendingAnalysisSavings from "./SpendingAnalysisSavings";

type Props = { finding: SpendingAnalysisFinding; currencyCode: CurrencyCode; onOpenEvidence: (finding: SpendingAnalysisFinding, historical?: boolean) => void };

export default function SpendingAnalysisFindingCard({ finding, currencyCode, onOpenEvidence }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const formatAmount = useAmountFormatter();
    const amount = formatAmount(finding.evidenceAmount, currencyCode);
    const savingsLabel = finding.savings
        ? t("savingsEstimate", { amount: formatAmount(finding.savings.estimate, currencyCode) })
        : t("estimatePending");
    const pastCount = finding.historicalTransactions?.length ?? 0;
    return (
        <details className="group min-w-0 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5" data-testid="spending-analysis-finding">
            <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-orange-500 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)_auto] sm:p-4 [&::-webkit-details-marker]:hidden">
                <span className="break-words text-sm font-semibold text-slate-900 dark:text-white">{finding.title}</span>
                <span className="col-start-1 row-start-2 grid min-w-0 grid-cols-2 gap-3 text-xs sm:col-start-2 sm:row-start-1">
                    <span className="min-w-0">
                        <span className="block text-slate-500 dark:text-slate-400">{t("relatedSpend")}</span>
                        <span className="block break-words font-semibold tabular-nums">{amount}</span>
                    </span>
                    <span className="min-w-0">
                        <span className="block text-slate-500 dark:text-slate-400">{t("estimatedSavings")}</span>
                        <span className="block break-words font-semibold tabular-nums text-violet-700 dark:text-violet-200">{savingsLabel}</span>
                    </span>
                </span>
                <ChevronDown size={18} className="col-start-2 row-start-1 text-slate-500 transition-transform group-open:rotate-180 sm:col-start-3" aria-hidden="true" />
            </summary>
            <div className="min-w-0 space-y-4 border-t border-slate-200 p-3 sm:p-4 dark:border-white/10" data-testid="spending-analysis-finding-details">
                <dl className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    <div><dt className="font-semibold">{t("observationLabel")}</dt><dd className="mt-1 break-words">{finding.reason}</dd></div>
                    {finding.opinion && <div><dt className="font-semibold">{t("opportunityLabel")}</dt><dd className="mt-1 break-words">{finding.opinion}</dd></div>}
                    <div><dt className="font-semibold">{t("actionLabel")}</dt><dd className="mt-1 break-words">{finding.action}</dd></div>
                </dl>
                {finding.savings ? <SpendingAnalysisSavings savings={finding.savings} currencyCode={currencyCode} showEstimate={false} />
                    : <p className="text-xs text-slate-500 dark:text-slate-400">{t("savingsUnavailable")}</p>}
                {Boolean(finding.savingsTransactions?.length) && <div className="text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold">{t("savingsPurchases")}</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                        {[...new Set(finding.savingsTransactions!.map(transaction => transaction.title))].slice(0, 3).map(title => <li key={title} className="break-words">{title}</li>)}
                    </ul>
                </div>}
                {finding.uncertainty && finding.uncertainty !== finding.savings?.assumption && <p className="break-words text-xs text-slate-500 dark:text-slate-400">{finding.uncertainty}</p>}
                <div className="flex flex-wrap gap-x-4 border-t border-slate-200 pt-1 dark:border-white/10">
                    <button type="button" onClick={() => onOpenEvidence(finding)}
                        className="flex min-h-11 max-w-full flex-wrap items-center gap-1 rounded-lg text-left text-sm font-semibold text-orange-600 dark:text-orange-300">
                        {t("evidence", { count: finding.evidenceTransactions.length, amount })}
                        <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                    {pastCount > 0 && <button type="button" onClick={() => onOpenEvidence(finding, true)} className="min-h-11 rounded-lg text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {t("historicalEvidence", { count: pastCount })}
                    </button>}
                </div>
            </div>
        </details>
    );
}
