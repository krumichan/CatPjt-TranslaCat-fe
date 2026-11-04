import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import type { SpendingAnalysisFinding } from "@/types/accountBookAnalysis";
import type { CurrencyCode } from "@/types/accountBook";
import SpendingAnalysisSavings from "./SpendingAnalysisSavings";

type Props = { finding: SpendingAnalysisFinding; currencyCode: CurrencyCode; onOpenEvidence: (finding: SpendingAnalysisFinding, historical?: boolean) => void };

export default function SpendingAnalysisFindingCard({ finding, currencyCode, onOpenEvidence }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const formatAmount = useAmountFormatter();
    return (
        <article className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5" data-testid="spending-analysis-finding">
            <h4 className="break-words font-semibold text-slate-900 dark:text-white">{finding.title}</h4>
            <p className="break-words text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold">{t("observationLabel")} </span>{finding.reason}</p>
            {finding.opinion && <p className="break-words text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">{t("opinionLabel")} </span>{finding.opinion}</p>}
            <p className="break-words text-sm text-slate-800 dark:text-slate-200"><span className="font-semibold">{t("actionLabel")} </span>{finding.action}</p>
            {finding.savings && <SpendingAnalysisSavings savings={finding.savings} currencyCode={currencyCode} />}
            {!finding.savings && <p className="text-xs text-slate-500 dark:text-slate-400">{t("savingsUnavailable")}</p>}
            {Boolean(finding.savingsTransactions?.length) && <div className="text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold">{t("savingsPurchases")}</p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                    {[...new Set(finding.savingsTransactions!.map(transaction => transaction.title))].slice(0, 3).map(title => <li key={title} className="break-words">{title}</li>)}
                </ul>
            </div>}
            {finding.uncertainty && <p className="break-words text-xs text-slate-500 dark:text-slate-400">{finding.uncertainty}</p>}
            <button type="button" onClick={() => onOpenEvidence(finding)}
                className="flex max-w-full flex-wrap items-center gap-1 rounded-lg py-2 text-left text-sm font-semibold text-orange-600 dark:text-orange-300">
                {t("evidence", { count: finding.evidenceTransactions.length, amount: formatAmount(finding.evidenceAmount, currencyCode) })}
                <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            {Boolean(finding.historicalTransactions?.length) && <button type="button" onClick={() => onOpenEvidence(finding, true)} className="block rounded-lg py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t("historicalEvidence", { count: finding.historicalTransactions!.length })}
            </button>}
        </article>
    );
}
