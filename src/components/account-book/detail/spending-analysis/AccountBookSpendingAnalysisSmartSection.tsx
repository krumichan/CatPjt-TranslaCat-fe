"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { ArrowUpRight, LoaderCircle, Sparkles, X } from "lucide-react";
import { AccountBookCurrencyProvider, useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import { useAccountBookSpendingAnalysis } from "@/hooks/account-book/detail/useAccountBookSpendingAnalysis";
import type { CurrencyCode } from "@/types/accountBook";
import type { SpendingAnalysisFinding, SpendingAnalysisResponse } from "@/types/accountBookAnalysis";
import SpendingAnalysisPeriodControls from "./SpendingAnalysisPeriodControls";
import SpendingAnalysisResult from "./SpendingAnalysisResult";
import SpendingAnalysisEvidenceModal from "./SpendingAnalysisEvidenceModal";
import SpendingAnalysisHistory from "./SpendingAnalysisHistory";
import { supportNotificationService } from "@/services/support/supportNotificationService";
import { inclusiveAnalysisEnd } from "@/utils/account-book/spendingAnalysis";

type Props = { accountBookId: number; selectedMonth: string; currencyCode: CurrencyCode };
type EvidenceSelection = { finding: SpendingAnalysisFinding; result: SpendingAnalysisResponse; historical: boolean; portalTarget: HTMLDialogElement };

export default function AccountBookSpendingAnalysisSmartSection({ accountBookId, selectedMonth, currencyCode }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const dialogRef = useRef<HTMLDialogElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);
    const evidenceTrigger = useRef<HTMLElement | null>(null);
    const [isOpen, setOpen] = useState(false);
    const analysis = useAccountBookSpendingAnalysis(accountBookId, selectedMonth, isOpen);
    const formatAmount = useAmountFormatter();
    const commentId = useId();
    const titleId = useId();
    const [evidence, setEvidence] = useState<EvidenceSelection | null>(null);
    const closeEvidence = useCallback(() => {
        setEvidence(null);
        const trigger = evidenceTrigger.current;
        evidenceTrigger.current = null;
        if (trigger) requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
    }, []);
    const resultKey = analysis.result?.analysisId || analysis.result?.generatedAt;
    const search = useSearchParams();
    const linkedJobId = positiveId(search.get("spendingAnalysisJob"));
    const linkedNotificationId = positiveId(search.get("notificationId"));
    const loadSaved = analysis.loadSaved;
    const { mutate } = useSWRConfig();

    // 알림의 작업 번호로 저장된 결과를 열고, 성공한 뒤에만 읽음 처리한다.
    useEffect(() => {
        if (!linkedJobId) return;
        let current = true;

        dialogRef.current?.showModal();
        setOpen(true);
        void loadSaved({ jobId: linkedJobId }).then(async opened => {
            if (!current || !opened || !linkedNotificationId) return;
            await supportNotificationService.markAsRead(linkedNotificationId);
            await mutate(key => Array.isArray(key)
                && (key[0] === "support-notification-summary" || key[0] === "support-notification-list"));
        }).catch(() => { /* 이미 연 분석 결과는 읽음 처리 실패와 독립적으로 유지한다. */ });
        return () => { current = false; };
    }, [linkedJobId, linkedNotificationId, loadSaved, mutate]);

    // 새 분석과 이력 선택은 폼 아래의 결과 요약으로 이동한다.
    useEffect(() => {
        if (isOpen && resultKey) resultRef.current?.scrollIntoView({ block: "start" });
    }, [isOpen, resultKey]);
    const openEvidence = (finding: SpendingAnalysisFinding, historical = false) => {
        const portalTarget = dialogRef.current;
        if (!analysis.result || !portalTarget) return;
        evidenceTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setEvidence({ finding, result: analysis.result, historical, portalTarget });
    };

    const job = analysis.job;
    const jobMessage = job && (analysis.jobActive || job.requestedByMe)
        ? t(`job.${job.status}`, { start: job.periodStart, end: inclusiveAnalysisEnd(job.periodEndExclusive) })
        : null;

    return (
        <section className="mb-6 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900" data-testid="spending-analysis">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <Sparkles size={19} className="shrink-0 text-violet-500" aria-hidden="true" />
                        {t("title")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("description")}</p>
                    {jobMessage && <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">{jobMessage}</p>}
                </div>
                <button type="button" data-testid="spending-analysis-open"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600"
                    onClick={() => {
                        dialogRef.current?.showModal();
                        setOpen(true);
                    }}>
                    {t("openAnalysis")}
                    <ArrowUpRight size={16} aria-hidden="true" />
                </button>
            </div>
            <dialog ref={dialogRef} aria-labelledby={titleId} aria-modal="true" data-testid="spending-analysis-dialog"
                onClose={() => {
                    setOpen(false);
                    closeEvidence();
                    if (linkedJobId) {
                        const url = new URL(window.location.href);
                        url.searchParams.delete("spendingAnalysisJob");
                        url.searchParams.delete("notificationId");
                        window.history.replaceState(null, "", url);
                    }
                }}
                className="fixed inset-0 m-auto w-[calc(100%-1rem)] max-w-4xl h-fit overflow-visible rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/65 sm:w-[calc(100%-2rem)] dark:border-white/15 dark:bg-zinc-900 dark:text-white">
                {/* 근거 거래는 모달 내부 top layer에 표시하고, 뒤에 있는 분석 컨트롤은 잠시 비활성화한다. */}
                <div inert={Boolean(evidence)} className="flex max-h-[calc(100dvh-1rem)] min-w-0 flex-col sm:max-h-[calc(100dvh-2rem)]">
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-white/10">
                        <h2 id={titleId} className="flex min-w-0 items-center gap-2 text-lg font-semibold">
                            <Sparkles size={20} className="shrink-0 text-violet-500" aria-hidden="true" />
                            {t("title")}
                        </h2>
                        <button type="button" aria-label={t("closeAnalysis")} onClick={() => dialogRef.current?.close()}
                            className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
                            <X size={20} aria-hidden="true" />
                        </button>
                    </header>
                    <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6" aria-busy={analysis.isLoadingSaved}>
                        {jobMessage && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/5">
                            <p role="status" className="min-w-0 flex-1" data-testid="spending-analysis-job-status">{jobMessage}</p>
                            {job?.canCancel && <button type="button" onClick={() => void analysis.cancelJob()} disabled={analysis.sending}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-white/10" data-testid="spending-analysis-cancel">
                                {t("cancel")}
                            </button>}
                            {job?.status === "SUCCEEDED" && job.analysisId && job.analysisId !== analysis.result?.analysisId &&
                                <button type="button" onClick={() => void analysis.loadSaved({ jobId: job.id })} disabled={analysis.isLoadingSaved}
                                    className="rounded-lg px-3 py-2 font-semibold text-orange-700 dark:text-orange-300">{t("job.openResult")}</button>}
                        </div>}
                        {analysis.jobError && <p role="status" className="mb-3 text-sm text-red-600 dark:text-red-300">{t("job.statusUnavailable")}</p>}
                        <SpendingAnalysisPeriodControls inputs={analysis.inputs} valid={Boolean(analysis.period)} onChange={next => { closeEvidence(); analysis.changeInputs(next); }} />
                        {!analysis.period && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{t("invalidPeriod")}</p>}
                        {analysis.snapshotLoading && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t("snapshotLoading")}</p>}
                        {analysis.snapshot && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("snapshotSummary", { count: analysis.snapshot.transactionCount, amount: formatAmount(analysis.snapshot.totalExpense, currencyCode) })}</p>}
                        {analysis.snapshotError && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><p>{t("snapshotFailed")}</p><button type="button" onClick={analysis.retrySnapshot} className="rounded-lg py-2 font-semibold text-orange-600 dark:text-orange-300">{t("retrySnapshot")}</button></div>}

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
                                    <button type="button" onClick={() => void analysis.run()} disabled={!analysis.period || analysis.sending || analysis.jobActive || analysis.jobLoading || analysis.isLoadingSaved || analysis.snapshot?.transactionCount === 0}
                                        className="flex max-w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50" data-testid="spending-analysis-run">
                                        {(analysis.sending || analysis.jobActive) && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
                                        {t(analysis.sending ? "job.submitting" : analysis.jobActive ? "analyzing" : analysis.result ? "reanalyze" : "analyze")}
                                    </button>
                                </div>
                            </div>
                            {(analysis.jobActive || analysis.isLoadingSaved) && <p role="status" className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(analysis.isLoadingSaved ? "historyLoadingResult" : "analyzingNotice")}</p>}
                        </div>
                        <div ref={resultRef}>
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
                        </div>
                        <SpendingAnalysisHistory history={analysis.history} page={analysis.historyPage} loading={analysis.historyLoading}
                            error={analysis.historyError} busy={analysis.isLoadingSaved} onPage={analysis.changeHistoryPage}
                            onOpen={id => { closeEvidence(); void analysis.loadSaved({ analysisId: id }); }} onRetry={analysis.retryHistory} />
                    </div>
                </div>
                {evidence && <AccountBookCurrencyProvider currencyCode={evidence.result.currencyCode} decimalPlaces={evidence.result.decimalPlaces}>
                    <SpendingAnalysisEvidenceModal finding={evidence.finding} historical={evidence.historical} currencyCode={evidence.result.currencyCode}
                        generatedAt={evidence.result.generatedAt} portalTarget={evidence.portalTarget} onClose={closeEvidence} />
                </AccountBookCurrencyProvider>}
            </dialog>
        </section>
    );
}

function positiveId(value: string | null): number | null {
    if (!value || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
