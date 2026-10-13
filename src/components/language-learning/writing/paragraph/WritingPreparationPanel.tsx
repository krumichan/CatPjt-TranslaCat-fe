"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createWritingPreparationService } from "@/services/language-learning/writingPreparationService";
import { ApiResponseError } from "@/services/common/responseParser";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { ParagraphWritingItem, ParagraphWritingPlan } from "@/types/language-learning/paragraphWriting";
import type { WritingPreparation, WritingPreparationRequest } from "@/types/language-learning/writingPreparation";

const topics = ["library-use", "home-task", "public-transport", "community-meeting", "weekend-plan", "reading-group-change", "clinic-appointment", "rainy-day-choice", "group-presentation", "gym-repair-notice"];
interface Props {
    owner: string;
    loginSessionId: string;
    writingType: DailyWritingType;
    busy: boolean;
    plan: ParagraphWritingPlan | null;
    openRequest: { key: string; sequence: number } | null;
    run: (operation: () => Promise<void>) => Promise<void>;
    onUse: (preparation: WritingPreparation) => void;
    onApply: (item: ParagraphWritingItem, preparation: WritingPreparation) => Promise<void>;
}

export function WritingPreparationPanel({ owner, loginSessionId, writingType, busy, plan, openRequest, run, onUse, onApply }: Props) {
    const t = useTranslations("WritingPreparation");
    const service = useMemo(() => createWritingPreparationService(loginSessionId), [loginSessionId]);
    const [prepared, setPrepared] = useState<WritingPreparation | null>(null);
    const [band, setBand] = useState(2);
    const [topic, setTopic] = useState(topics[0]);
    const [notes, setNotes] = useState("");
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const [pendingRequest, setPendingRequest] = useState<WritingPreparationRequest | null>(null);
    const [storageFailed, setStorageFailed] = useState(false);
    const mounted = useRef(false);
    const pendingRef = useRef<string | null>(null);
    const storageKey = `writing-preparation:${owner}:${loginSessionId}`;

    const accept = useCallback((value: WritingPreparation) => {
        if (!mounted.current) return;
        // 다른 원본의 조회가 전송 불명인 유료 명령의 복구 키를 지우지 못하게 한다.
        if (pendingRef.current !== null && pendingRef.current !== value.requestKey) return;
        setPrepared(value);
        pendingRef.current = value.requiresReconciliation || value.status === "GENERATED" ? value.requestKey : null;
        setPendingKey(pendingRef.current);
        if (!["RUNNING", "GENERATED", "UNCERTAIN"].includes(value.status)) {
            setPendingRequest(null);
            try { window.sessionStorage.removeItem(storageKey); } catch { setStorageFailed(true); }
        }
        const url = new URL(window.location.href);
        url.searchParams.set("preparationKey", value.requestKey);
        window.history.replaceState(null, "", url);
    }, [storageKey]);

    useEffect(() => {
        mounted.current = true;
        // 진입은 저장 결과만 조회한다. 남은 명령은 사용자 복구 버튼으로만 재전송한다.
        const key = new URL(window.location.href).searchParams.get("preparationKey");
        if (key && /^[a-zA-Z0-9._-]{1,80}$/.test(key)) {
            pendingRef.current = key;
            void run(async () => {
                let saved: WritingPreparationRequest | null = null;
                try {
                    const raw = window.sessionStorage.getItem(storageKey);
                    const value = raw ? JSON.parse(raw) as WritingPreparationRequest : null;
                    if (value?.requestKey === key) saved = value;
                } catch { /* 저장 결과 조회는 브라우저 복구 정보 없이도 가능하다. */ }
                try {
                    const value = await service.get(key);
                    accept(value);
                    if (mounted.current && ["RUNNING", "GENERATED", "UNCERTAIN"].includes(value.status)) setPendingRequest(saved);
                } catch (reason) {
                    // 계정 전환으로 남은 타인의 URL 키는 조회할 수 없다. 내 복구 명령이 없는 404만 해제한다.
                    if (mounted.current && saved === null && reason instanceof ApiResponseError && reason.status === 404
                        && reason.errorCode === "WRITING_PREPARATION_NOT_FOUND") {
                        pendingRef.current = null;
                        setPendingKey(null);
                        const url = new URL(window.location.href);
                        url.searchParams.delete("preparationKey");
                        window.history.replaceState(null, "", url);
                        return;
                    }
                    // 조회 실패 때도 원래 키를 유지해 새 명령으로 중복 생성하지 않는다.
                    if (mounted.current) { setPendingKey(key); setPendingRequest(saved); }
                    throw reason;
                }
            });
        }
        return () => { mounted.current = false; };
    }, [accept, run, service, storageKey]);

    useEffect(() => {
        if (openRequest && (pendingRef.current === null || pendingRef.current === openRequest.key)) {
            void run(async () => { accept(await service.get(openRequest.key)); });
        }
    }, [accept, openRequest, run, service]);

    async function send(request: WritingPreparationRequest) {
        // 전송 전 키를 보관해 응답 유실 뒤에도 같은 키로 복구한다. 새 키 자동 재시도는 없다.
        pendingRef.current = request.requestKey;
        setPendingKey(request.requestKey);
        setPendingRequest(request);
        try { window.sessionStorage.setItem(storageKey, JSON.stringify(request)); } catch { setStorageFailed(true); }
        const url = new URL(window.location.href);
        url.searchParams.set("preparationKey", request.requestKey);
        window.history.replaceState(null, "", url);
        accept(await service.prepare(request));
    }

    const replacementItem = prepared?.repairOfRequestKey ? plan?.items.find((item) =>
        !item.answered && item.preparationRequestKey === prepared.repairOfRequestKey) : undefined;
    const pending = pendingKey !== null;
    return <section className="space-y-3 rounded-xl border border-amber-300 p-4" data-testid="writing-preparation-panel">
        <h2 className="font-bold">{t("title")}</h2>
        <p className="text-sm">{t("notice")}</p>
        <div className="flex flex-wrap items-end gap-3">
            <label>{t("band")}<select className="ml-2 rounded border bg-transparent p-2" aria-label={t("band")} disabled={busy || pending} value={band} onChange={(event) => setBand(Number(event.target.value))}>
                {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>B{value}</option>)}
            </select></label>
            <label>{t("topic")}<select className="ml-2 max-w-full rounded border bg-transparent p-2" aria-label={t("topic")} disabled={busy || pending} value={topic} onChange={(event) => setTopic(event.target.value)}>
                {topics.map((value) => <option key={value} value={value}>{t(`topics.${value}`)}</option>)}
            </select></label>
            <button type="button" disabled={busy || pending} className="rounded border px-3 py-2 disabled:opacity-50" onClick={() => void run(async () => {
                await send({ requestKey: crypto.randomUUID(), writingType, targetBand: band, topicKey: topic });
            })}>{t("prepare")}</button>
        </div>
        {storageFailed && <p role="alert">{t("storageFailed")}</p>}
        {pendingKey && <div role="status" className="space-y-2">
            <p>{t("pending")}</p>
            <button type="button" disabled={busy} className="rounded border p-2" onClick={() => void run(async () => { accept(await service.get(pendingKey)); })}>{t("refresh")}</button>
            {pendingRequest && <button type="button" disabled={busy || prepared?.requiresReconciliation === true} className="ml-2 rounded border p-2" onClick={() => void run(async () => { await send(pendingRequest); })}>{t("recover")}</button>}
        </div>}
        {prepared && <div className="space-y-3" data-testid="writing-preparation-result">
            <p className="font-medium">{t(`states.${prepared.status}`)} · {prepared.writingType} · B{prepared.targetBand}</p>
            <ul className="list-disc pl-5 text-sm">{prepared.quality.reasonCodes.map((reason) => <li key={reason}>{t(`reasons.${reason}`)}</li>)}</ul>
            {prepared.failureCode && <p role="alert">{t("failed")}</p>}
            {prepared.candidate && <>
                <p className="whitespace-pre-wrap break-words" data-testid="prepared-prompt">{prepared.candidate.prompt}</p>
                <ul className="list-disc pl-5">{prepared.candidate.visibleRequirements.map((line, index) => <li key={index}>{line}</li>)}</ul>
                {replacementItem ? <button type="button" disabled={busy || pending} className="rounded border p-2" onClick={() => void run(async () => { await onApply(replacementItem, prepared); })}>{t("apply")}</button> :
                    !plan && <button type="button" disabled={busy || pending} className="rounded border p-2" onClick={() => onUse(prepared)}>{t("use")}</button>}
            </>}
            {prepared.repairNotes && <p className="whitespace-pre-wrap break-words text-sm">{t("savedReason")}: {prepared.repairNotes}</p>}
            {prepared.canRepair ? <div className="space-y-2">
                <p className="text-sm">{t(prepared.repairMode === "CORE_REPLACEMENT" ? "coreRepairNotice" : "contentRepairNotice")}</p>
                <label className="block" htmlFor="writing-repair-notes">{t("reason")}</label>
                <textarea id="writing-repair-notes" className="w-full rounded border bg-transparent p-2" rows={3} maxLength={2000} value={notes} disabled={busy || pending} onChange={(event) => setNotes(event.target.value)} />
                <button type="button" disabled={busy || pending || !notes.trim()} className="rounded border p-2 disabled:opacity-50" onClick={() => void run(async () => {
                    await send({ requestKey: crypto.randomUUID(), writingType: prepared.writingType, targetBand: prepared.targetBand,
                        topicKey: prepared.topicKey, repairOfRequestKey: prepared.requestKey, repairNotes: notes.trim() });
                })}>{t(prepared.repairMode === "CORE_REPLACEMENT" ? "replace" : "repair")}</button>
            </div> : <p className="text-sm">{t(`blocked.${prepared.repairBlockedReason}`)}</p>}
        </div>}
    </section>;
}
