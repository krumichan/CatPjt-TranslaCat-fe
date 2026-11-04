import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { accountBookSpendingAnalysisService, SpendingAnalysisError } from "@/services/account-book/accountBookSpendingAnalysisService";
import type { SpendingAnalysisResponse, SpendingAnalysisSnapshot } from "@/types/accountBookAnalysis";
import { analysisLocale, analysisScopeKey, createAnalysisRequestCoordinator, initialAnalysisInputs, inputsFromAnalysis, matchesAnalysisPeriod, parseAnalysisPeriod, type SpendingAnalysisInputs } from "@/utils/account-book/spendingAnalysis";

type CheckedSnapshot = SpendingAnalysisSnapshot & { checkedAt: number };
type AnalysisRecord = { scope: string; response: SpendingAnalysisResponse; receivedAt: number };

export function useAccountBookSpendingAnalysis(accountBookId: number, selectedMonth: string, isVisible: boolean) {
    const locale = analysisLocale(useLocale());
    const [inputs, setInputs] = useState<SpendingAnalysisInputs>(() => {
        const initial = initialAnalysisInputs(selectedMonth);
        const first = `${initial.monthValue}-01`;
        const following = new Date(`${first}T00:00:00Z`); following.setUTCMonth(following.getUTCMonth() + 1); following.setUTCDate(0);
        return { ...initial, periodType: "MONTHLY", quarterValue: String(Math.ceil(Number(initial.monthValue.slice(5)) / 3)),
            halfValue: Number(initial.monthValue.slice(5)) <= 6 ? "1" : "2", startValue: first, endValue: following.toISOString().slice(0, 10) };
    });
    const [comments, setComments] = useState<Record<string, string>>({});
    const [record, setRecord] = useState<AnalysisRecord | null>(null);
    const [isPending, setPending] = useState(false);
    const [isLoadingSaved, setLoadingSaved] = useState(false);
    const [error, setError] = useState<"failed" | "stale" | "busy" | "unavailable" | null>(null);
    const [coordinator] = useState(createAnalysisRequestCoordinator);
    const period = parseAnalysisPeriod(inputs.periodType, inputs.monthValue, inputs.yearValue, inputs);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyActivated, setHistoryActivated] = useState(isVisible);
    const [historyRevision, setHistoryRevision] = useState(0);
    const scope = analysisScopeKey(accountBookId, period, locale);
    const comment = comments[scope] ?? "";
    const currentRecord = record?.scope === scope ? record : null;
    const result = currentRecord?.response ?? null;

    // 기본 화면에서는 지문·건수만 조회한다. 실제 거래의 AI 분석 전송은 run에서만 한다.
    const snapshotQuery = useQuery({
        keys: period ? ["account-book-spending-analysis-snapshot", scope] as const : null,
        fetcher: async () => ({ ...await accountBookSpendingAnalysisService.snapshot(accountBookId, period!), checkedAt: Date.now() }),
        config: { revalidateOnMount: true, revalidateIfStale: true, revalidateOnFocus: Boolean(result && isVisible), refreshInterval: result && isVisible ? 60_000 : 0, refreshWhenHidden: false, shouldRetryOnError: false },
    });
    const snapshot: CheckedSnapshot | undefined = snapshotQuery.data;
    const snapshotVerified = Boolean(currentRecord && snapshot && snapshot.checkedAt >= currentRecord.receivedAt);
    const isStale = Boolean(result && snapshotVerified && snapshot?.snapshotFingerprint !== result.snapshotFingerprint);
    const hasUnappliedComment = Boolean(result && comment.trim() !== (result.contextComment ?? "").trim());
    useEffect(() => {
        // 한 번 연 목록은 스크롤·페이지 높이 변화로 화면 밖에 나가도 유지한다.
        if (isVisible) setHistoryActivated(true);
    }, [isVisible]);

    const historyQuery = useQuery({
        keys: historyActivated ? ["account-book-spending-analysis-history", accountBookId, historyPage, historyRevision] as const : null,
        fetcher: () => accountBookSpendingAnalysisService.history(accountBookId, historyPage),
        config: { revalidateOnFocus: false, revalidateOnMount: true, revalidateIfStale: true, shouldRetryOnError: false },
    });

    useEffect(() => {
        // 가계부·언어가 바뀌면 이전 요청 소유권과 화면의 대기 상태를 함께 정리한다.
        coordinator.cancel();
        setPending(false);
        setLoadingSaved(false);
        setError(null);
        setHistoryPage(0);
        return () => coordinator.cancel();
    }, [coordinator, accountBookId, locale]);

    const cancel = useCallback(() => {
        coordinator.cancel();
        setPending(false);
        setLoadingSaved(false);
    }, [coordinator]);

    const changeInputs = (next: Partial<typeof inputs>) => {
        // 기간 전환 시 늦게 도착하는 이전 요청이 새 화면의 결과·오류를 바꾸지 않는다.
        cancel();
        setError(null);
        setInputs(current => ({ ...current, ...next }));
    };

    const run = async () => {
        if (!period || comment.length > 2000) return;
        const requestOwner = coordinator.start(scope);
        if (!requestOwner) return;
        const request = { ...period, locale, ...(comment.trim() ? { comment: comment.trim() } : {}) };
        setError(null);
        setPending(true);

        try {
            const response = await accountBookSpendingAnalysisService.analyze(accountBookId, request, requestOwner.controller.signal);
            if (!coordinator.isCurrent(requestOwner)) return;
            if (!matchesAnalysisPeriod(response, period, accountBookId)) throw new SpendingAnalysisError(409);
            const receivedAt = Date.now();

            // 서버가 분석 중 변경을 검사한 뒤에도 도착 시점의 새 거래와 한 번 더 대조한다.
            let fresh: CheckedSnapshot | null = null;
            try {
                fresh = { ...await accountBookSpendingAnalysisService.snapshot(accountBookId, period, requestOwner.controller.signal), checkedAt: Date.now() };
            } catch {
                // 지문 재확인 실패는 이미 생성된 유료 분석을 버리지 않고 확인 대기 상태로 보인다.
            }
            if (!coordinator.isCurrent(requestOwner)) return;
            if (fresh) {
                await snapshotQuery.mutate(fresh, false);
                if (!coordinator.isCurrent(requestOwner)) return;
                if (fresh.snapshotFingerprint !== response.snapshotFingerprint) throw new SpendingAnalysisError(409);
            }
            setRecord({ scope, response, receivedAt });
            setHistoryPage(0);
            // 이전 페이지의 캐시를 재사용하지 않고 새 분석 이후의 목록을 조회한다.
            setHistoryRevision(current => current + 1);
        } catch (failure) {
            if (!coordinator.isCurrent(requestOwner)) return;
            const status = failure instanceof SpendingAnalysisError ? failure.status : 0;
            setError(status === 409 ? "stale" : status === 429 ? "busy" : status === 503 ? "unavailable" : "failed");
            // 재분석 실패 시 같은 기간의 기존 결과와 반영된 코멘트는 그대로 보존한다.
        } finally {
            if (coordinator.isCurrent(requestOwner)) {
                coordinator.finish(requestOwner);
                setPending(false);
            }
        }
    };

    const loadSaved = async (analysisId: string) => {
        const owner = coordinator.start(`history:${analysisId}`);
        if (!owner) return;
        setPending(true);
        setLoadingSaved(true);
        setError(null);
        try {
            const response = await accountBookSpendingAnalysisService.saved(accountBookId, analysisId, owner.controller.signal);
            if (!coordinator.isCurrent(owner)) return;
            const savedInputs = inputsFromAnalysis(response);
            const savedPeriod = parseAnalysisPeriod(savedInputs.periodType, savedInputs.monthValue, savedInputs.yearValue, savedInputs);
            if (!savedPeriod || !matchesAnalysisPeriod(response, savedPeriod, accountBookId)) throw new SpendingAnalysisError(409);
            const savedScope = analysisScopeKey(accountBookId, savedPeriod, locale);
            // 저장된 생성 당시 결과·코멘트를 표시하고 현재 원장과의 차이는 지문 조회로 알린다.
            setInputs(savedInputs);
            setComments(current => ({ ...current, [savedScope]: response.contextComment ?? "" }));
            setRecord({ scope: savedScope, response, receivedAt: 0 });
        } catch {
            if (coordinator.isCurrent(owner)) setError("failed");
        } finally {
            if (coordinator.isCurrent(owner)) {
                coordinator.finish(owner);
                setPending(false);
                setLoadingSaved(false);
            }
        }
    };

    return {
        inputs, period, comment, result, isPending, isLoadingSaved, error, snapshot,
        snapshotLoading: snapshotQuery.isLoading,
        snapshotError: Boolean(snapshotQuery.isError),
        snapshotVerified, isStale, hasUnappliedComment,
        changeInputs,
        changeComment: (value: string) => setComments(current => ({ ...current, [scope]: value })),
        retrySnapshot: () => void snapshotQuery.mutate(),
        run, cancel,
        history: historyQuery.data, historyLoading: historyQuery.isLoading, historyError: Boolean(historyQuery.isError),
        historyPage, changeHistoryPage: setHistoryPage, loadSaved, retryHistory: () => void historyQuery.mutate(),
    };
}
