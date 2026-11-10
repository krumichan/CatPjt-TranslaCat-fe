import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { accountBookSpendingAnalysisService, SpendingAnalysisError } from "@/services/account-book/accountBookSpendingAnalysisService";
import type { SpendingAnalysisJob, SpendingAnalysisResponse, SpendingAnalysisSnapshot } from "@/types/accountBookAnalysis";
import { analysisLocale, analysisScopeKey, createAnalysisRequestCoordinator, initialAnalysisInputs, inputsFromAnalysis, matchesAnalysisPeriod, parseAnalysisPeriod, type SpendingAnalysisInputs } from "@/utils/account-book/spendingAnalysis";

type CheckedSnapshot = SpendingAnalysisSnapshot & { checkedAt: number };
type AnalysisRecord = { scope: string; response: SpendingAnalysisResponse; receivedAt: number };
type AnalysisError = "failed" | "busy" | "unavailable" | "cancelFailed";

function isActive(job?: SpendingAnalysisJob | null) {
    return job?.status === "QUEUED" || job?.status === "RUNNING" || job?.status === "CANCELING";
}

export function useAccountBookSpendingAnalysis(accountBookId: number, selectedMonth: string, isVisible: boolean) {
    const locale = analysisLocale(useLocale());
    const [inputs, setInputs] = useState<SpendingAnalysisInputs>(() => {
        const initial = initialAnalysisInputs(selectedMonth);
        const first = `${initial.monthValue}-01`;
        const following = new Date(`${first}T00:00:00Z`);
        following.setUTCMonth(following.getUTCMonth() + 1);
        following.setUTCDate(0);
        return { ...initial, periodType: "MONTHLY", quarterValue: String(Math.ceil(Number(initial.monthValue.slice(5)) / 3)),
            halfValue: Number(initial.monthValue.slice(5)) <= 6 ? "1" : "2", startValue: first, endValue: following.toISOString().slice(0, 10) };
    });
    const [comments, setComments] = useState<Record<string, string>>({});
    const [record, setRecord] = useState<AnalysisRecord | null>(null);
    const [sending, setSending] = useState(false);
    const [isLoadingSaved, setLoadingSaved] = useState(false);
    const [error, setError] = useState<AnalysisError | null>(null);
    const [coordinator] = useState(createAnalysisRequestCoordinator);
    const mutationInFlight = useRef(false);
    const follow = useRef<{ id: number; scope: string } | null>(null);
    const period = parseAnalysisPeriod(inputs.periodType, inputs.monthValue, inputs.yearValue, inputs);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyActivated, setHistoryActivated] = useState(isVisible);
    const scope = analysisScopeKey(accountBookId, period, locale);
    const comment = comments[scope] ?? "";
    const currentRecord = record?.scope === scope ? record : null;
    const result = currentRecord?.response ?? null;

    // 분석 작업은 화면 상태와 분리한다. 화면을 다시 열면 DB의 현재 상태를 조회한다.
    const jobQuery = useQuery({
        keys: ["account-book-spending-analysis-job", accountBookId] as const,
        fetcher: () => accountBookSpendingAnalysisService.currentJob(accountBookId),
        config: {
            revalidateOnMount: true,
            revalidateOnFocus: true,
            refreshInterval: data => isActive(data) || isVisible ? 3_000 : 30_000,
            refreshWhenHidden: false,
            shouldRetryOnError: false,
        },
    });
    const job = jobQuery.data;
    const jobActive = isActive(job);

    // 결과를 새로 열면 현재 거래를 다시 확인하고, 저장 당시 거래와 다르면 표시한다.
    const snapshotQuery = useQuery({
        keys: period && isVisible ? ["account-book-spending-analysis-snapshot", scope, result?.analysisId ?? ""] as const : null,
        fetcher: async () => ({ ...await accountBookSpendingAnalysisService.snapshot(accountBookId, period!), checkedAt: Date.now() }),
        config: { revalidateOnMount: true, revalidateIfStale: true, revalidateOnFocus: Boolean(result), refreshInterval: result ? 60_000 : 0, refreshWhenHidden: false, shouldRetryOnError: false },
    });
    const snapshot: CheckedSnapshot | undefined = snapshotQuery.data;
    const snapshotVerified = Boolean(currentRecord && snapshot && snapshot.checkedAt >= currentRecord.receivedAt);
    const isStale = Boolean(result && snapshotVerified && snapshot?.snapshotFingerprint !== result.snapshotFingerprint);
    const hasUnappliedComment = Boolean(result && comment.trim() !== (result.contextComment ?? "").trim());

    useEffect(() => {
        if (isVisible) setHistoryActivated(true);
    }, [isVisible]);

    const historyQuery = useQuery({
        keys: historyActivated ? ["account-book-spending-analysis-history", accountBookId, historyPage, job?.id ?? "", job?.status ?? ""] as const : null,
        fetcher: () => accountBookSpendingAnalysisService.history(accountBookId, historyPage),
        config: { revalidateOnFocus: true, revalidateOnMount: true, revalidateIfStale: true, shouldRetryOnError: false },
    });

    useEffect(() => () => coordinator.cancel(), [coordinator]);

    const changeInputs = (next: Partial<typeof inputs>) => {
        // 기간 전환은 화면에서 기다리는 이력 조회만 해제한다.
        follow.current = null;
        coordinator.cancel();
        setLoadingSaved(false);
        setError(null);
        setInputs(current => ({ ...current, ...next }));
    };

    const run = async () => {
        if (!period || comment.length > 2000 || jobActive || mutationInFlight.current) return;
        mutationInFlight.current = true;
        setError(null);
        setSending(true);

        try {
            const request = { ...period, locale, ...(comment.trim() ? { comment: comment.trim() } : {}) };
            const submitted = await accountBookSpendingAnalysisService.enqueue(accountBookId, request);
            follow.current = { id: submitted.id, scope };
            setHistoryPage(0);
            await jobQuery.mutate(submitted, true);
        } catch (failure) {
            const status = failure instanceof SpendingAnalysisError ? failure.status : 0;
            setError(status === 409 || status === 429 ? "busy" : status === 503 ? "unavailable" : "failed");
            void jobQuery.mutate();
        } finally {
            mutationInFlight.current = false;
            setSending(false);
        }
    };

    const cancelJob = async () => {
        if (!job?.canCancel || mutationInFlight.current) return;
        mutationInFlight.current = true;
        setSending(true);
        setError(null);

        try {
            const canceled = await accountBookSpendingAnalysisService.cancelJob(accountBookId, job.id);
            await jobQuery.mutate(canceled, true);
        } catch {
            setError("cancelFailed");
            void jobQuery.mutate();
        } finally {
            mutationInFlight.current = false;
            setSending(false);
        }
    };

    const loadSaved = useCallback(async (reference: { analysisId: string } | { jobId: number }, preserveDraft = false) => {
        // 저장 결과 선택과 알림 열기만 화면에 묶고, 서버 분석 자체는 취소하지 않는다.
        follow.current = null;
        coordinator.cancel();
        const owner = coordinator.start("saved-analysis");
        if (!owner) return false;
        const { signal } = owner.controller;
        setLoadingSaved(true);
        setError(null);

        try {
            const analysisId = "analysisId" in reference ? reference.analysisId
                : (await accountBookSpendingAnalysisService.job(accountBookId, reference.jobId, signal)).analysisId;
            if (!analysisId) throw new SpendingAnalysisError(404);
            const response = await accountBookSpendingAnalysisService.saved(accountBookId, analysisId, signal);
            if (!coordinator.isCurrent(owner)) return false;
            const savedInputs = inputsFromAnalysis(response);
            const savedPeriod = parseAnalysisPeriod(savedInputs.periodType, savedInputs.monthValue, savedInputs.yearValue, savedInputs);
            if (!savedPeriod || !matchesAnalysisPeriod(response, savedPeriod, accountBookId)) throw new SpendingAnalysisError(409);
            const savedScope = analysisScopeKey(accountBookId, savedPeriod, locale);
            setInputs(savedInputs);
            if (!preserveDraft) {
                setComments(current => ({ ...current, [savedScope]: response.contextComment ?? "" }));
            }
            setRecord({ scope: savedScope, response, receivedAt: Date.now() });
            return true;
        } catch {
            if (coordinator.isCurrent(owner)) setError("failed");
            return false;
        } finally {
            if (coordinator.isCurrent(owner)) {
                coordinator.finish(owner);
                setLoadingSaved(false);
            }
        }
    }, [accountBookId, coordinator, locale]);

    useEffect(() => {
        // 같은 기간을 보는 동안 완료된 내 요청만 자동으로 연다.
        if (isVisible && job?.status === "SUCCEEDED" && job.analysisId && follow.current?.id === job.id
                && follow.current.scope === scope) {
            void loadSaved({ analysisId: job.analysisId }, true);
        }
    }, [isVisible, job, loadSaved, scope]);

    const recheckResult = snapshotQuery.mutate;
    useEffect(() => {
        if (isVisible && result) void recheckResult();
    }, [isVisible, result, recheckResult]);

    return {
        inputs, period, comment, result, isLoadingSaved, error, snapshot,
        job, jobActive, jobLoading: jobQuery.isLoading, jobError: Boolean(jobQuery.isError), sending,
        snapshotLoading: snapshotQuery.isLoading,
        snapshotError: Boolean(snapshotQuery.isError),
        snapshotVerified, isStale, hasUnappliedComment,
        changeInputs,
        changeComment: (value: string) => setComments(current => ({ ...current, [scope]: value })),
        retrySnapshot: () => void snapshotQuery.mutate(),
        run, cancelJob,
        history: historyQuery.data, historyLoading: historyQuery.isLoading, historyError: Boolean(historyQuery.isError),
        historyPage, changeHistoryPage: setHistoryPage, loadSaved, retryHistory: () => void historyQuery.mutate(),
    };
}
