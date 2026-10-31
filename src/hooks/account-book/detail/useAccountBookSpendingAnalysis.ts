import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useQuery } from "@/hooks/useQuery";
import { accountBookSpendingAnalysisService, SpendingAnalysisError } from "@/services/account-book/accountBookSpendingAnalysisService";
import type { SpendingAnalysisPeriod, SpendingAnalysisResponse, SpendingAnalysisSnapshot } from "@/types/accountBookAnalysis";
import { analysisLocale, analysisScopeKey, createAnalysisRequestCoordinator, initialAnalysisInputs, matchesAnalysisPeriod, parseAnalysisPeriod } from "@/utils/account-book/spendingAnalysis";

type CheckedSnapshot = SpendingAnalysisSnapshot & { checkedAt: number };
type AnalysisRecord = { scope: string; response: SpendingAnalysisResponse; receivedAt: number };

export function useAccountBookSpendingAnalysis(accountBookId: number, selectedMonth: string, isVisible: boolean) {
    const locale = analysisLocale(useLocale());
    const [inputs, setInputs] = useState(() => ({ ...initialAnalysisInputs(selectedMonth), periodType: "MONTHLY" as SpendingAnalysisPeriod["periodType"] }));
    const [comments, setComments] = useState<Record<string, string>>({});
    const [record, setRecord] = useState<AnalysisRecord | null>(null);
    const [isPending, setPending] = useState(false);
    const [error, setError] = useState<"failed" | "stale" | "busy" | "unavailable" | null>(null);
    const [coordinator] = useState(createAnalysisRequestCoordinator);
    const period = parseAnalysisPeriod(inputs.periodType, inputs.monthValue, inputs.yearValue);
    const scope = analysisScopeKey(accountBookId, period, locale);
    const comment = comments[scope] ?? "";
    const currentRecord = record?.scope === scope ? record : null;
    const result = currentRecord?.response ?? null;

    // 기본 화면에서는 지문·건수만 조회한다. 실제 거래의 AI 분석 전송은 run에서만 한다.
    const snapshotQuery = useQuery({
        keys: period ? ["account-book-spending-analysis-snapshot", accountBookId, period.periodType, period.year, period.month ?? "ALL"] as const : null,
        fetcher: async () => ({ ...await accountBookSpendingAnalysisService.snapshot(accountBookId, period!), checkedAt: Date.now() }),
        config: { revalidateOnMount: true, revalidateIfStale: true, revalidateOnFocus: Boolean(result && isVisible), refreshInterval: result && isVisible ? 60_000 : 0, refreshWhenHidden: false, shouldRetryOnError: false },
    });
    const snapshot: CheckedSnapshot | undefined = snapshotQuery.data;
    const snapshotVerified = Boolean(currentRecord && snapshot && snapshot.checkedAt >= currentRecord.receivedAt);
    const isStale = Boolean(result && snapshotVerified && snapshot?.snapshotFingerprint !== result.snapshotFingerprint);
    const hasUnappliedComment = Boolean(result && comment.trim() !== (result.contextComment ?? "").trim());

    useEffect(() => () => coordinator.cancel(), [coordinator]);

    const cancel = useCallback(() => {
        coordinator.cancel();
        setPending(false);
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

    return {
        inputs, period, comment, result, isPending, error, snapshot,
        snapshotLoading: snapshotQuery.isLoading,
        snapshotError: Boolean(snapshotQuery.isError),
        snapshotVerified, isStale, hasUnappliedComment,
        changeInputs,
        changeComment: (value: string) => setComments(current => ({ ...current, [scope]: value })),
        retrySnapshot: () => void snapshotQuery.mutate(),
        run, cancel,
    };
}
