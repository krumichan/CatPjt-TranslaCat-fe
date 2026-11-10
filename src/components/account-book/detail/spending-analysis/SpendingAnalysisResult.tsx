import { useLocale, useTranslations } from "next-intl";
import type { SpendingAnalysisFinding, SpendingAnalysisResponse } from "@/types/accountBookAnalysis";
import { analysisLocale, inclusiveAnalysisEnd } from "@/utils/account-book/spendingAnalysis";
import SpendingAnalysisFindingCard from "./SpendingAnalysisFindingCard";
import SpendingAnalysisSavings from "./SpendingAnalysisSavings";

type Props = { result: SpendingAnalysisResponse; stale: boolean; snapshotVerified: boolean; onOpenEvidence: (finding: SpendingAnalysisFinding, historical?: boolean) => void };

export default function SpendingAnalysisResult({ result, stale, snapshotVerified, onOpenEvidence }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const locale = analysisLocale(useLocale());
    const generatedDate = new Date(result.generatedAt);
    const generatedAt = Number.isFinite(generatedDate.getTime())
        ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(generatedDate)
        : result.generatedAt;

    return (
        <div className="mt-5 min-w-0 space-y-4" data-testid="spending-analysis-result" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t("resultTitle")}</h3>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {t(result.contextComment ? "contextApplied" : "amountOnly")}
                </span>
            </div>
            <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                {t("resultPeriod", { start: result.periodStart.slice(0, 10), end: inclusiveAnalysisEnd(result.periodEndExclusive), generatedAt })}
            </p>
            {stale && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" data-testid="spending-analysis-stale">{t("staleResult")}</p>}
            {!snapshotVerified && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{t("snapshotUnverified")}</p>}
            {result.coverage.isPartial && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" data-testid="spending-analysis-partial">
                {t("partialCoverage", { analyzed: new Intl.NumberFormat(locale).format(result.coverage.analyzedTransactionCount), total: new Intl.NumberFormat(locale).format(result.coverage.totalTransactionCount) })}
            </p>}
            <section className="min-w-0 rounded-xl bg-slate-100 p-4 dark:bg-white/5">
                <h4 className="text-sm font-semibold">{t("keyTakeaways")}</h4>
                <p className="mt-2 break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{result.summary}</p>
            </section>
            {result.savings && <SpendingAnalysisSavings savings={result.savings} currencyCode={result.currencyCode} total />}
            <section className="min-w-0 space-y-3">
                <h4 className="text-sm font-semibold">{t("findingsHeading", { count: result.findings.length })}</h4>
                <div key={result.analysisId || result.generatedAt} className="grid min-w-0 gap-2">
                    {result.findings.map(finding => <SpendingAnalysisFindingCard key={finding.id} finding={finding} currencyCode={result.currencyCode} onOpenEvidence={onOpenEvidence} />)}
                </div>
                {result.findings.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("noFindings")}</p>}
            </section>
            <details className="text-sm text-slate-500 dark:text-slate-400">
                <summary className="py-2">{t("appliedComment")}</summary>
                <p className="mt-1 whitespace-pre-wrap break-words">{result.contextComment || t("noComment")}</p>
            </details>
        </div>
    );
}
