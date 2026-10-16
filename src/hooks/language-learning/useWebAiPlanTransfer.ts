"use client";

import { useEffect, useRef, useState } from "react";

import { buildWebAiTransferPrompt } from "@/features/language-learning/web-ai/webAiTransferPrompt";
import type { createWebAiLearningService } from "@/services/language-learning/webAiLearningService";
import type { WebAiConnection, WebAiPlan, WebAiRun } from "@/types/language-learning/webAi";

interface PreparedTransfer {
    connection?: WebAiConnection;
    run?: WebAiRun;
    executionKey?: string;
    nextExecutionKey?: string;
    contextKey?: string;
    prompt?: string;
}

interface TransferCache {
    account: string | null;
    plans: Map<string, PreparedTransfer>;
}

export function useWebAiPlanTransfer({ account, plan, contextKey, locale, api }: {
    account: string | null;
    plan?: WebAiPlan;
    contextKey: string;
    locale: "ko" | "ja" | "learning";
    api: ReturnType<typeof createWebAiLearningService>;
}) {
    const cache = useRef<TransferCache>({ account: null, plans: new Map() });
    const activeAccount = useRef(account);
    const requestContext = `${plan?.id ?? ""}:${contextKey}`;
    const activeContext = useRef(requestContext);
    const pending = useRef<string | null>(null);
    const [snapshot, setSnapshot] = useState<TransferCache>({ account: null, plans: new Map() });
    const [activity, setActivity] = useState<{ account: string | null; busy: boolean }>({ account: null, busy: false });

    useEffect(() => {
        activeAccount.current = account;
        activeContext.current = requestContext;
        // 연결 키와 프롬프트는 계정이 바뀌면 폐기하고 브라우저 저장소에는 기록하지 않는다.
        if (cache.current.account !== account) {
            cache.current = { account, plans: new Map() };
        }
    }, [account, requestContext]);

    const assertCurrent = () => {
        if (activeAccount.current !== account || activeContext.current !== requestContext) {
            throw new Error("WEB_AI_PROMPT_CONTEXT_CHANGED");
        }
    };

    const publish = (id: string, transfer: PreparedTransfer) => {
        if (activeAccount.current !== account) throw new Error("WEB_AI_ACCOUNT_CHANGED");
        cache.current.plans.set(id, transfer);
        setSnapshot({ account, plans: new Map(cache.current.plans) });
    };

    const perform = async (action: () => Promise<string | void>) => {
        if (pending.current === account || !account || !plan) return;
        pending.current = account;
        setActivity({ account, busy: true });
        try {
            const result = await action();
            assertCurrent();
            return result;
        } finally {
            if (pending.current === account) pending.current = null;
            if (activeAccount.current === account) setActivity({ account, busy: false });
        }
    };

    const prepare = () => perform(async () => {
        if (!plan) return;
        const existing = cache.current.plans.get(plan.id) ?? {};
        if (existing.prompt && existing.connection && existing.run && existing.contextKey === contextKey) {
            return buildWebAiTransferPrompt(existing.connection, existing.run, locale, plan);
        }

        // 복사 재시도와 계획 재편집은 같은 연결 키를 사용한다. 키 교체는 명시적 회전만 수행한다.
        const next: PreparedTransfer = existing.contextKey === contextKey
            ? { ...existing }
            : { connection: existing.connection, contextKey };
        if (!next.connection) {
            next.connection = await api.createConnection(plan.id);
            publish(plan.id, next);
            assertCurrent();
        }

        // 응답 유실이나 클립보드 실패에도 같은 실행 키와 준비된 회차를 보존한다.
        if (!next.run) {
            next.executionKey ??= crypto.randomUUID();
            publish(plan.id, next);
            next.run = await api.createRun(plan.id, next.executionKey);
            assertCurrent();
        }
        next.prompt = buildWebAiTransferPrompt(next.connection, next.run, locale, plan);
        publish(plan.id, next);
        return next.prompt;
    });

    const rotate = () => perform(async () => {
        if (!plan) return;
        const existing = cache.current.plans.get(plan.id) ?? {};
        // 서버가 키를 바꾼 뒤 응답만 유실될 수 있어, 요청 전부터 이전 키 복사를 막는다.
        publish(plan.id, { ...existing, connection: undefined, prompt: undefined });
        const connection = await api.createConnection(plan.id);
        const next: PreparedTransfer = { ...existing, connection, prompt: undefined };
        assertCurrent();
        if (existing.run && existing.contextKey === contextKey) {
            next.prompt = buildWebAiTransferPrompt(connection, existing.run, locale, plan);
        }
        publish(plan.id, next);
    });

    const revoke = () => perform(async () => {
        if (!plan) return;
        // 해제 응답 유실 시에도 폐기되었을 가능성이 있는 키를 다시 사용하지 않는다.
        const existing = cache.current.plans.get(plan.id) ?? {};
        publish(plan.id, { ...existing, connection: undefined, prompt: undefined });
        await api.revokeConnection(plan.id);
        // 해제된 토큰을 다시 복사할 수 없도록 준비된 전송문도 함께 폐기한다.
        publish(plan.id, {});
    });

    const renew = () => perform(async () => {
        if (!plan) return;
        const existing = cache.current.plans.get(plan.id);
        if (!existing?.connection || !existing.run || existing.contextKey !== contextKey) {
            throw new Error("WEB_AI_PROMPT_NOT_PREPARED");
        }

        // 새 수동 학습은 명시적으로만 만든다. 실패하면 이전 문구와 다음 실행 키를 함께 보존한다.
        existing.nextExecutionKey ??= crypto.randomUUID();
        publish(plan.id, { ...existing });
        const run = await api.createRun(plan.id, existing.nextExecutionKey);
        assertCurrent();
        const prompt = buildWebAiTransferPrompt(existing.connection, run, locale, plan);
        publish(plan.id, { connection: existing.connection, contextKey, run, prompt, executionKey: existing.nextExecutionKey });
    });

    const entry = snapshot.account === account && plan ? snapshot.plans.get(plan.id) : undefined;
    return {
        busy: activity.account === account && activity.busy,
        connection: entry?.connection ?? null,
        prompt: entry?.contextKey === contextKey && entry.prompt && entry.connection && entry.run && plan
            ? buildWebAiTransferPrompt(entry.connection, entry.run, locale, plan)
            : "",
        prepare,
        rotate,
        revoke,
        renew,
    };
}

export type WebAiPlanTransfer = ReturnType<typeof useWebAiPlanTransfer>;
