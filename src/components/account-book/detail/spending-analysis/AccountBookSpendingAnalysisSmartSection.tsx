"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Sparkles } from "lucide-react";
import { AccountBookCurrencyProvider, useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import { useAccountBookSpendingAnalysis } from "@/hooks/account-book/detail/useAccountBookSpendingAnalysis";
import type { CurrencyCode } from "@/types/accountBook";
import type { SpendingAnalysisFinding, SpendingAnalysisResponse } from "@/types/accountBookAnalysis";
import SpendingAnalysisPeriodControls from "./SpendingAnalysisPeriodControls";
import SpendingAnalysisResult from "./SpendingAnalysisResult";
import SpendingAnalysisEvidenceModal from "./SpendingAnalysisEvidenceModal";
import SpendingAnalysisHistory from "./SpendingAnalysisHistory";

type Props = { accountBookId: number; selectedMonth: string; currencyCode: CurrencyCode };
type EvidenceSelection = { finding: SpendingAnalysisFinding; result: SpendingAnalysisResponse; historical: boolean };

export default function AccountBookSpendingAnalysisSmartSection({ accountBookId, selectedMonth, currencyCode }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const cardRef = useRef<HTMLElement>(null);
    const [isVisible, setVisible] = useState(false);
    const analysis = useAccountBookSpendingAnalysis(accountBookId, selectedMonth, isVisible);
    const formatAmount = useAmountFormatter();
    const commentId = useId();
    const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
    const closeEvidence = useCallback(() => setEvidence(null), []);
    useEffect(() => {
        const element = cardRef.current;
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const openEvidence = (finding: SpendingAnalysisFinding, historical = false) => {
        if (analysis.result) setEvidence({ finding, result: analysis.result, historical });
    };

    return (
        <section ref={cardRef} className="mb-6 min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-zinc-900/90" data-testid="spending-analysis" aria-busy={analysis.isPending}>
            <header className="mb-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Sparkles size={20} className="shrink-0 text-violet-500" aria-hidden="true" />{t("title")}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
            </header>
            <SpendingAnalysisPeriodControls inputs={analysis.inputs} valid={Boolean(analysis.period)} onChange={next => { closeEvidence(); analysis.changeInputs(next); }} />
            {!analysis.period && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{t("invalidPeriod")}</p>}
            {analysis.snapshotLoading && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("snapshotLoading")}</p>}
            {analysis.snapshot && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("snapshotSummary", { count: analysis.snapshot.transactionCount, amount: formatAmount(analysis.snapshot.totalExpense, currencyCode) })}</p>}
            {analysis.snapshotError && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><p>{t("snapshotFailed")}</p><button type="button" onClick={analysis.retrySnapshot} className="rounded-lg py-2 font-semibold text-orange-600 dark:text-orange-300">{t("retrySnapshot")}</button></div>}

            {analysis.result ? (
                <AccountBookCurrencyProvider currencyCode={analysis.result.currencyCode} decimalPlaces={analysis.result.decimalPlaces}>
                    <SpendingAnalysisResult result={analysis.result} stale={analysis.isStale} snapshotVerified={analysis.snapshotVerified} onOpenEvidence={openEvidence} />
                </AccountBookCurrencyProvider>
            ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-5 text-sm dark:border-white/10">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{t(analysis.snapshot?.transactionCount === 0 ? "noExpenses" : "emptyTitle")}</p>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">{t("emptyDescription")}</p>
                </div>
            )}

            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={commentId} className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("commentLabel")} <span className="font-normal text-slate-500 dark:text-slate-400">{t("optional")}</span></label>
                    <span className="text-xs tabular-nums text-slate-400">{analysis.comment.length} / 2000</span>
                </div>
                <textarea id={commentId} value={analysis.comment} maxLength={2000} rows={3} onChange={event => analysis.changeComment(event.target.value)} placeholder={t("commentPlaceholder")}
                    className="w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-base text-slate-900 outline-offset-2 dark:border-white/10 dark:bg-black/20 dark:text-white" />
                {analysis.hasUnappliedComment && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300" data-testid="spending-analysis-unapplied">{t("commentNotApplied")}</p>}
                {analysis.error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{t(`errors.${analysis.error}`)}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-xl text-xs text-slate-500 dark:text-slate-400">{t("manualNotice")}</p>
                    <div className="flex max-w-full flex-wrap items-center gap-2">
                        {analysis.isPending && <button type="button" onClick={analysis.cancel} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">{t("cancel")}</button>}
                        <button type="button" onClick={() => void analysis.run()} disabled={!analysis.period || analysis.isPending || analysis.snapshot?.transactionCount === 0}
                            className="flex max-w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50" data-testid="spending-analysis-run">
                            {analysis.isPending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
                            {t(analysis.isLoadingSaved ? "historyLoadingResult" : analysis.isPending ? "analyzing" : analysis.result ? "reanalyze" : "analyze")}
                        </button>
                    </div>
                </div>
                {analysis.isPending && <p role="status" className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(analysis.isLoadingSaved ? "historyLoadingResult" : "analyzingNotice")}</p>}
            </div>
            {evidence && <AccountBookCurrencyProvider currencyCode={evidence.result.currencyCode} decimalPlaces={evidence.result.decimalPlaces}>
                <SpendingAnalysisEvidenceModal finding={evidence.finding} historical={evidence.historical} currencyCode={evidence.result.currencyCode} generatedAt={evidence.result.generatedAt} onClose={closeEvidence} />
            </AccountBookCurrencyProvider>}
            <SpendingAnalysisHistory history={analysis.history} page={analysis.historyPage} loading={analysis.historyLoading}
                error={analysis.historyError} busy={analysis.isPending} onPage={analysis.changeHistoryPage}
                onOpen={id => { closeEvidence(); void analysis.loadSaved(id); }} onRetry={analysis.retryHistory} />
        </section>
    );
}
