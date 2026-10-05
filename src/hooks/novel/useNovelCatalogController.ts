"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { acceptCatalog, catalogSelectorKey } from "@/features/novel/catalog";
import { novelCatalogService } from "@/services/novel/novelCatalogService";
import type { CatalogSelector, CatalogSnapshot } from "@/types/novel/catalog";

const wait = (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, 600);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
});

export function useNovelCatalogController(platform: string, selector: CatalogSelector, enabled: boolean) {
    const { status, data: session } = useSession();
    const owner = session?.user.publicId ?? session?.user.email ?? "";
    const selectorKey = JSON.stringify(selector);
    const scope = `${platform}:${owner}:${selectorKey}`;
    const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [retrying, setRetrying] = useState<string[]>([]);
    const [reload, setReload] = useState(0);
    const operation = useRef(0);
    const current = useRef<{ scope: string; snapshot: CatalogSnapshot; trace: string } | null>(null);
    const commands = useRef(new Map<string, string>());
    const retries = useRef(new Set<string>());
    const activeScope = useRef<string | null>(null);

    const poll = useCallback(async (initial: CatalogSnapshot, signal: AbortSignal, generation: number, trace: string) => {
        let value = initial;
        const deadline = performance.now() + 610_000;
        while (value.state === "RUNNING") {
            if (performance.now() >= deadline) throw new Error("CATALOG_STATUS_DEADLINE");
            await wait(signal);
            const next = await novelCatalogService.status(platform, value.snapshotId, signal, trace);
            if (signal.aborted || generation !== operation.current) return;
            const adopted = current.current?.snapshot;
            // 재시도 응답보다 늦게 도착한 이전 GET은 덮어쓰지 않는다.
            if (adopted && next.eventSequence < adopted.eventSequence) continue;
            if (!acceptCatalog(adopted ?? value, next)) throw new Error("STALE_CATALOG_RESULT");
            current.current = { scope, snapshot: next, trace };
            setSnapshot(next); value = next;
        }
    }, [platform, scope]);

    useEffect(() => {
        const generation = ++operation.current;
        activeScope.current = enabled && status === "authenticated" ? scope : null;
        const request = new AbortController();
        setError(null); retries.current.clear(); setRetrying([]);
        if (!enabled || status !== "authenticated") { setSnapshot(null); return () => request.abort(); }
        const existing = current.current?.scope === scope ? current.current : null;
        if (!existing) setSnapshot(null);
        const trace = existing?.trace ?? crypto.randomUUID();
        let idempotencyKey = commands.current.get(scope);
        if (!idempotencyKey) { idempotencyKey = crypto.randomUUID(); commands.current.set(scope, idempotencyKey); }
        // 화면 최초 준비 POST와 읽기 전용 재연결 GET을 구분한다. rerender는 새 명령이 아니다.
        const load = existing ? novelCatalogService.status(platform, existing.snapshot.snapshotId, request.signal, trace)
            : novelCatalogService.start(platform, JSON.parse(selectorKey) as CatalogSelector, idempotencyKey, AbortSignal.timeout(90_000), trace);
        void load.then(async next => {
            if (request.signal.aborted || generation !== operation.current) {
                // 시작 응답 전에 떠난 경우에도 snapshot을 알게 되면 구독을 해지해 남은 큐를 중지한다.
                if (activeScope.current !== scope) {
                    commands.current.delete(scope);
                    void novelCatalogService.cancel(platform, next.snapshotId).catch(() => {});
                }
                return;
            }
            if (catalogSelectorKey(next.selector) !== catalogSelectorKey(JSON.parse(selectorKey))) throw new Error("CATALOG_SELECTOR_MISMATCH");
            if (existing && !acceptCatalog(existing.snapshot, next)) throw new Error("STALE_CATALOG_RESULT");
            current.current = { scope, snapshot: next, trace }; setSnapshot(next);
            await poll(next, request.signal, generation, trace);
        }).catch(reason => { if (!request.signal.aborted && generation === operation.current) setError(reason instanceof Error ? reason.message : "CATALOG_REQUEST_FAILED"); });
        return () => {
            request.abort();
            activeScope.current = null;
        };
    }, [enabled, status, scope, selectorKey, platform, reload, poll]);

    useEffect(() => () => {
        // 조회 재연결과 분리한 화면/검색 세대 해지다. 공유 작업 자체의 소유권은 서버가 유지한다.
        if (current.current?.scope === scope) {
            commands.current.delete(scope);
            void novelCatalogService.cancel(platform, current.current.snapshot.snapshotId).catch(() => {});
        }
    }, [platform, scope]);

    const retry = async (identifier: string) => {
        const value = current.current;
        if (!value || value.scope !== scope || retries.current.has(identifier) || status !== "authenticated"
            || !value.snapshot.items.some(item => item.identifier === identifier && item.status === "FAILED" && !item.errorCode?.includes("REFUSAL"))) return;
        const generation = operation.current;
        retries.current.add(identifier); setRetrying([...retries.current]);
        try {
            const next = await novelCatalogService.retry(platform, value.snapshot.snapshotId, identifier, crypto.randomUUID(), AbortSignal.timeout(90_000), value.trace);
            if (generation !== operation.current) return;
            const previous = current.current?.snapshot ?? value.snapshot;
            if (next.eventSequence >= previous.eventSequence) {
                if (!acceptCatalog(previous, next)) throw new Error("STALE_CATALOG_RESULT");
                current.current = { scope, snapshot: next, trace: value.trace }; setSnapshot(next);
            }
            // 이후는 조회만 다시 연결한다. 유료 retry POST는 명시 클릭당 한 번이다.
            setReload(count => count + 1);
        } catch (reason) { if (generation === operation.current) setError(reason instanceof Error ? reason.message : "CATALOG_RETRY_FAILED"); }
        finally { if (generation === operation.current) { retries.current.delete(identifier); setRetrying([...retries.current]); } }
    };
    const visible = current.current?.scope === scope ? snapshot : null;
    return { snapshot: visible, error, loading: !visible && enabled && status !== "unauthenticated", retrying, retry, reconnect: () => setReload(count => count + 1) };
}
