import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import type { SpendingAnalysisFinding } from "@/types/accountBookAnalysis";
import type { CurrencyCode } from "@/types/accountBook";

type Props = { finding: SpendingAnalysisFinding; currencyCode: CurrencyCode; onOpenEvidence: (finding: SpendingAnalysisFinding) => void };

export default function SpendingAnalysisFindingCard({ finding, currencyCode, onOpenEvidence }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const formatAmount = useAmountFormatter();
    return (
        <article className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5" data-testid="spending-analysis-finding">
            <h4 className="break-words font-semibold text-slate-900 dark:text-white">{finding.title}</h4>
            <p className="break-words text-sm text-slate-600 dark:text-slate-300">{finding.reason}</p>
            <p className="break-words text-sm text-slate-800 dark:text-slate-200"><span className="font-semibold">{t("actionLabel")} </span>{finding.action}</p>
            {finding.contextQuestion && <p className="break-words text-sm text-slate-500 dark:text-slate-400">{finding.contextQuestion}</p>}
            {finding.uncertainty && <p className="break-words text-xs text-slate-500 dark:text-slate-400">{finding.uncertainty}</p>}
            <button type="button" onClick={() => onOpenEvidence(finding)}
                className="flex max-w-full flex-wrap items-center gap-1 rounded-lg py-2 text-left text-sm font-semibold text-orange-600 dark:text-orange-300">
                {t("evidence", { count: finding.evidenceTransactions.length, amount: formatAmount(finding.evidenceAmount, currencyCode) })}
                <ArrowUpRight size={16} aria-hidden="true" />
            </button>
        </article>
    );
}
