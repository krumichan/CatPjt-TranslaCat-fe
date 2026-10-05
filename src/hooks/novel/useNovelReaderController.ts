"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useMenuControl } from "@/hooks/useMenuControl";
import { useNovelReadAloud } from "@/hooks/novel/useNovelReadAloud";
import { useReaderFontSize } from "@/hooks/novel/useReaderFontSize";
import { acceptSnapshot, novelReaderBasePath } from "@/features/novel/readerModel";
import { completedRepair, recoveryTargets } from "@/features/novel/recovery";
import { paintedReaderTimings, readerPollingBudget, sameReaderPresentation } from "@/features/novel/readerMetrics";
import { novelReaderService } from "@/services/novel/novelReaderService";
import { ROUTES, to } from "@/constants/routes";
import { scrollToTop } from "@/utils/scroll";
import type { ReaderSnapshot, ReaderTimings, RepairTimings } from "@/types/novel/reader";

function waitForPoll(signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const onAbort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, 600);
        signal.addEventListener("abort", onAbort, { once: true });
        if (signal.aborted) onAbort();
    });
}

async function pollReader(base: string, initial: ReaderSnapshot, signal: AbortSignal, deadline: number, publish: (value: ReaderSnapshot) => void, traceId: string) {
    const polling = new AbortController();
    const cancel = () => polling.abort();
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    const timer = setTimeout(cancel, Math.max(1, deadline - performance.now()));
    try {
        let current = initial;
        while (["QUEUED", "RUNNING"].includes(current.state)) {
            if (performance.now() >= deadline || !current.jobId) throw new Error("STATUS_DEADLINE");
            await waitForPoll(polling.signal);
            const next = await novelReaderService.status(base, current.jobId, polling.signal, traceId);
            if (signal.aborted) return;
            if (!acceptSnapshot(current, next)) throw new Error("STALE_READER_RESULT");
            if (!sameReaderPresentation(current, next)) publish(next);
            current = next;
        }
    } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
    }
}

export function useNovelReaderController(platform: string, novel: string, episode: string) {
    const locale = useLocale();
    const { status: authStatus, data: session } = useSession();
    const ownerScope = session?.user.publicId ?? session?.user.email ?? "";
    const router = useAppRouter();
    const base = novelReaderBasePath(platform, novel, episode);
    const menu = useMenuControl({ hasBottomBar: true });
    const [snapshot, setSnapshot] = useState<ReaderSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [reload, setReload] = useState(0);
    const { fontSize, changeFont } = useReaderFontSize();
    const [timings, setTimings] = useState<ReaderTimings>({});
    const [repairTimings, setRepairTimings] = useState<RepairTimings | null>(null);
    const [viewChoice, setViewChoice] = useState<{ locale: string; value: "ja" | "ko" | "parallel" } | null>(null);
    const view = viewChoice?.locale === locale ? viewChoice.value : locale === "learning" ? "parallel" : locale === "ja" ? "ja" : "ko";
    const operation = useRef(0);
    const started = useRef(0);
    const appliedAt = useRef(0);
    const sourceReadTraceId = useRef("");
    const translationRequest = useRef<AbortController | null>(null);
    const startingTranslation = useRef(false);
    const repairing = useRef(false);
    const repairOperation = useRef<RepairTimings | null>(null);
    const audio = useNovelReadAloud(base, snapshot, locale, authStatus === "authenticated", timings.traceId, ownerScope);
    const publishSnapshot = useCallback((value: ReaderSnapshot, sourceRead = false) => {
        appliedAt.current = performance.now();
        setSnapshot(value);
        const repair = repairOperation.current;
        if (repair && repair.state !== "CANCELLED" && (completedRepair(value, repair.runTraceId ?? repair.traceId, repair.targetIds) || repair.disposition === "REUSED_READY")) {
            repair.committedObservedMs ??= appliedAt.current - repair.startedAt;
            repairing.current = false;
            setRepairTimings({ ...repair });
        } else if (repair?.state === "RUNNING" && value.recovery?.traceId === (repair.runTraceId ?? repair.traceId)
            && ["FAILED", "PARTIAL", "CANCELLED"].includes(value.recovery.state)) {
            // 전체 A가 계속 실행돼도 해당 복구의 terminal 실패를 즉시 알리고 다음 명시 명령을 허용한다.
            repair.state = value.recovery.state === "CANCELLED" ? "CANCELLED" : "FAILED";
            repair.errorCode = value.recovery.errorCode ?? "REPAIR_INCOMPLETE";
            repairing.current = false;
            setRepairTimings({ ...repair });
        }
        const fetched = value.timings?.sourceFetchIncluded;
        if (sourceRead && typeof fetched === "boolean") {
            setTimings(previous => previous.origin === "reader-entry" ? { ...previous, sourceFetchIncluded: fetched, sourceCached: !fetched } : previous);
        }
        // DB commit 자체의 span이 아니다. FE가 durable 응답을 수신한 시각을 paint와 별도로 기록한다.
        if (value.durableComplete) {
            const observed = appliedAt.current - started.current;
            setTimings(previous => ({ ...previous, durableObserved: previous.durableObserved ?? observed, durableComplete: previous.durableComplete ?? observed }));
        }
    }, []);

    useEffect(() => {
        if (authStatus === "loading") return;
        const request = new AbortController();
        const generation = ++operation.current;
        translationRequest.current?.abort();
        translationRequest.current = request;
        startingTranslation.current = false;
        setBusy(false);
        repairing.current = false;
        repairOperation.current = null;
        setRepairTimings(null);
        setSnapshot(null);
        setError(null);
        setLoading(authStatus === "authenticated");
        const traceId = crypto.randomUUID();
        sourceReadTraceId.current = traceId;
        started.current = performance.now();
        setTimings({ traceId, sourceReadTraceId: traceId, origin: "reader-entry", originDocumentTimeMs: started.current, sourceRequestIncluded: true });
        if (authStatus !== "authenticated") return () => request.abort();

        // 원문 GET은 유료 번역을 시작하지 않는다. 메타데이터 번역을 기다리지 않고 표시한다.
        void novelReaderService.snapshot(base, request.signal, traceId).then(async value => {
            if (generation !== operation.current || request.signal.aborted) return;
            publishSnapshot(value, true);
            setLoading(false);
            // 재진입 시 이미 실행 중인 작업은 조회만 이어간다. 유료 POST를 다시 보내지 않는다.
            if (["QUEUED", "RUNNING"].includes(value.state)) {
                setBusy(true);
                await pollReader(base, value, request.signal, performance.now() + readerPollingBudget(value, true), next => {
                    if (generation === operation.current && !request.signal.aborted) publishSnapshot(next);
                }, traceId);
            }
        }).catch(() => {
            if (!request.signal.aborted && generation === operation.current) setError("SOURCE_LOAD_FAILED");
        }).finally(() => {
            if (!request.signal.aborted && generation === operation.current) { setLoading(false); setBusy(false); }
        });
        return () => {
            request.abort();
            translationRequest.current?.abort();
            operation.current += 1;
        };
    }, [base, authStatus, ownerScope, reload, publishSnapshot]);

    useEffect(() => {
        // 읽기 위치를 건드리는 동작은 회차 이동에만 한정한다.
        scrollToTop("instant");
    }, [base]);

    useEffect(() => {
        if (!snapshot) return;
        const generation = operation.current;
        const applied = appliedAt.current;
        let secondFrame = 0;
        const frame = requestAnimationFrame(() => {
            secondFrame = requestAnimationFrame(() => {
                if (generation !== operation.current) return;
                const elapsed = performance.now() - started.current;
                setTimings(previous => paintedReaderTimings(previous, snapshot, elapsed, performance.now() - applied));
                const repair = repairOperation.current;
                // 실제 commit 확인 뒤 해당 DOM의 paint가 끝나야 사용자 복구 완료 시간으로 기록한다.
                if (repair && repair.state !== "CANCELLED" && (completedRepair(snapshot, repair.runTraceId ?? repair.traceId, repair.targetIds) || repair.disposition === "REUSED_READY")) {
                    repair.repairReadyMs ??= performance.now() - repair.startedAt;
                    repair.state = "SUCCEEDED";
                    setRepairTimings({ ...repair });
                }
            });
        });
        return () => { cancelAnimationFrame(frame); cancelAnimationFrame(secondFrame); };
    }, [snapshot]);

    useEffect(() => {
        if (!repairTimings || repairTimings.state !== "RUNNING") return;
        const timer = setTimeout(() => {
            const current = repairOperation.current;
            if (current?.state === "RUNNING") { current.delayed = true; setRepairTimings({ ...current }); }
        }, Math.max(0, 5000 - (performance.now() - repairTimings.startedAt)));
        return () => clearTimeout(timer);
    }, [repairTimings]);

    const translate = useCallback(async (retryFailed = false) => {
        if (!snapshot || busy || startingTranslation.current || authStatus !== "authenticated") return;
        startingTranslation.current = true;
        const request = new AbortController();
        translationRequest.current?.abort();
        translationRequest.current = request;
        const generation = ++operation.current;
        started.current = performance.now();
        const traceId = crypto.randomUUID();
        // 명시적 번역 클릭 시 원문은 이미 화면에 있다. 이 작업의 원문 표시 지연은 0이다.
        setTimings({ firstSource: 0, traceId, sourceReadTraceId: sourceReadTraceId.current, sourceRequestIncluded: false, sourceFetchIncluded: false, sourceCached: true, origin: "translation-click", originDocumentTimeMs: started.current });
        setBusy(true);
        setError(null);
        try {
            // 업무 재시도는 Novel이 소유한다. FE는 시작 요청을 자동 재전송하지 않는다.
            const current = await novelReaderService.translate(base, snapshot.revision, crypto.randomUUID(), retryFailed, request.signal, traceId);
            if (request.signal.aborted || generation !== operation.current) return;
            if (!acceptSnapshot(snapshot, current, true)) throw new Error("STALE_READER_RESULT");
            publishSnapshot(current);
            await pollReader(base, current, request.signal, started.current + readerPollingBudget(current), next => {
                if (!request.signal.aborted && generation === operation.current) publishSnapshot(next);
            }, traceId);
        } catch {
            if (!request.signal.aborted && generation === operation.current) setError("TRANSLATION_REQUEST_FAILED");
        } finally {
            if (!request.signal.aborted && generation === operation.current) { setBusy(false); startingTranslation.current = false; }
        }
    }, [snapshot, busy, authStatus, base, publishSnapshot]);

    const repair = useCallback(async (segmentId?: string, clickedAt = performance.now()) => {
        if (!snapshot?.jobId || repairing.current || authStatus !== "authenticated") return;
        const targetIds = recoveryTargets(snapshot, segmentId);
        if (!targetIds.length) return;
        const now = performance.now();
        const traceId = crypto.randomUUID();
        const measurement: RepairTimings = { traceId, targetIds, startedAt: clickedAt >= 0 && clickedAt <= now ? clickedAt : now, delayed: false, state: "RUNNING" };
        repairOperation.current = measurement;
        setRepairTimings({ ...measurement });
        repairing.current = true;
        const request = new AbortController();
        translationRequest.current?.abort(); translationRequest.current = request;
        const generation = ++operation.current;
        setBusy(true); setError(null);
        try {
            // 활성 A의 확정 FAILED도 개별 명령을 보낸다. PENDING 여부·대상 소유권·중복 병합은 서버가 다시 판정한다.
            const next = await novelReaderService.repair(base, snapshot.jobId, snapshot.revision, crypto.randomUUID(), segmentId, request.signal, traceId);
            if (request.signal.aborted || generation !== operation.current) return;
            if (!acceptSnapshot(snapshot, next)) throw new Error("STALE_READER_RESULT");
            // 다른 탭의 같은 작업에 합류하거나 이미 저장된 결과를 재사용하면 cold 복구와 분리한다.
            const allReady = targetIds.every(id => next.segments.some(item => item.id === id && item.status === "SUCCEEDED"));
            if (allReady && next.recovery?.traceId !== traceId) measurement.disposition = "REUSED_READY";
            else if (next.recovery) {
                measurement.runTraceId = next.recovery.traceId;
                measurement.repairId = next.recovery.repairId;
                measurement.targetIds = next.recovery.targetIds;
                measurement.disposition = next.recovery.traceId === traceId ? "REQUESTED" : "JOINED";
            }
            publishSnapshot(next);
            await pollReader(base, next, request.signal, now + readerPollingBudget(next), value => {
                if (!request.signal.aborted && generation === operation.current) publishSnapshot(value);
            }, traceId);
            if (!measurement.committedObservedMs && measurement.committedObservedMs !== 0) {
                measurement.state = "FAILED"; measurement.errorCode = "REPAIR_INCOMPLETE"; setRepairTimings({ ...measurement });
            }
        } catch (reason) {
            if (!request.signal.aborted && generation === operation.current) {
                const code = reason instanceof Error ? reason.message : "REPAIR_REQUEST_FAILED";
                // 복구 commit 이후의 원래 A 조회 오류는 성공한 문장의 복구 기록을 실패로 뒤집지 않는다.
                if (measurement.committedObservedMs === undefined) {
                    measurement.state = "FAILED"; measurement.errorCode = code; setRepairTimings({ ...measurement });
                }
                setError(code);
            }
        } finally {
            if (!request.signal.aborted && generation === operation.current) { repairing.current = false; setBusy(false); }
        }
    }, [snapshot, authStatus, base, publishSnapshot]);

    const cancel = async () => {
        if (!snapshot?.jobId) return;
        audio.stop(); translationRequest.current?.abort();
        const generation = ++operation.current;
        repairing.current = false; startingTranslation.current = false; setBusy(false);
        if (repairOperation.current) { repairOperation.current.state = "CANCELLED"; setRepairTimings({ ...repairOperation.current }); }
        try {
            const next = await novelReaderService.cancel(base, snapshot.jobId, AbortSignal.timeout(90_000), crypto.randomUUID());
            if (generation === operation.current && acceptSnapshot(snapshot, next)) publishSnapshot(next);
        } catch { if (generation === operation.current) setError("CANCEL_REQUEST_FAILED"); }
    };

    const navigate = (target?: string | null) => {
        if (!target) return;
        // 라우터 응답이나 unmount를 기다리지 않고 회차 이동 의사 시점에 다음 합성을 취소한다.
        audio.stop();
        router.push(to(ROUTES.EPISODE_VIEWER, platform, snapshot?.pagerInfo?.listIdentifier ?? novel, target));
    };

    return {
        snapshot, loading, error, busy, fontSize, changeFont, timings, repairTimings, repair, cancel, view,
        setView: (value: "ja" | "ko" | "parallel") => setViewChoice({ locale, value }),
        locale, episode, menu, audio, translate,
        retryLoad: () => setReload(value => value + 1),
        onPrev: () => navigate(snapshot?.pagerInfo?.prevIdentifier),
        onNext: () => navigate(snapshot?.pagerInfo?.nextIdentifier),
        onList: () => {
            audio.stop();
            router.push(to(ROUTES.NOVEL_DETAIL, platform, snapshot?.pagerInfo?.listIdentifier ?? novel));
        },
        // 사전 등록 후 문자열 정규식으로 HTML을 다시 만들지 않고 서버 원문 모델을 재조회한다.
        onRegisterSuccess: () => setReload(value => value + 1),
    };
}

export type NovelReaderController = ReturnType<typeof useNovelReaderController>;
