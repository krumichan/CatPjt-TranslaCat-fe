"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { parseParagraphTarget, PARAGRAPH_CONTRACT_ERROR } from "@/features/language-learning/writing/paragraphWritingContract";
import { paragraphDraftKey, readParagraphDraft, writeParagraphDraft } from "@/features/language-learning/writing/paragraphWritingDrafts";
import { ApiResponseError } from "@/services/common/responseParser";
import { createParagraphWritingService } from "@/services/language-learning/paragraphWritingService";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { ParagraphWritingConfig, ParagraphWritingItem, ParagraphWritingPlan, ParagraphWritingPreview } from "@/types/language-learning/paragraphWriting";
import { ParagraphWritingControls } from "./ParagraphWritingControls";
import { ParagraphWritingItemCard } from "./ParagraphWritingItemCard";
import { ParagraphWritingProgress } from "./ParagraphWritingProgress";

export function ParagraphWritingWorkspace({ owner, loginSessionId }: { owner: string; loginSessionId: string }) {
    const t = useTranslations("ParagraphWriting");
    const service = useMemo(() => createParagraphWritingService(loginSessionId), [loginSessionId]);
    const [config, setConfig] = useState<ParagraphWritingConfig | null>(null);
    const [configError, setConfigError] = useState(false);
    const [type, setType] = useState<DailyWritingType>("TRANSLATION");
    const [target, setTarget] = useState("5");
    const [rePractice, setRePractice] = useState(false);
    const [plan, setPlan] = useState<ParagraphWritingPlan | null>(null);
    const [preview, setPreview] = useState<ParagraphWritingPreview | null>(null);
    const [historyDate, setHistoryDate] = useState("");
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [draftUnavailable, setDraftUnavailable] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [showWorkload, setShowWorkload] = useState(false);
    const inFlight = useRef(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const acceptPlan = useCallback((next: ParagraphWritingPlan) => {
        // 계정 전환·다른 화면 이동 뒤의 늦은 응답은 URL이나 현재 화면을 바꾸지 않는다.
        if (!mounted.current) return;
        // 답안은 소유자·본문 revision별 초안에만 연결한다. 다른 계획의 초안을 덮어쓰지 않는다.
        const loaded: Record<string, string> = {};
        try {
            for (const item of next.items) {
                const key = paragraphDraftKey(owner, next.dailySetId, item.itemId, item.contentRevision);
                loaded[key] = readParagraphDraft(window.localStorage, key);
            }
        } catch {
            setDraftUnavailable(true);
        }
        setDrafts((previous) => ({ ...loaded, ...previous }));
        setPlan(next);
        setType(next.writingType);
        setTarget(String(next.targetItemCount));
        setHistoryDate(next.learningDate);
        setPreview(null);
        const url = new URL(window.location.href);
        url.searchParams.set("planId", String(next.dailySetId));
        window.history.replaceState(null, "", url);
    }, [owner]);

    const handleError = useCallback((reason: unknown) => {
        if (!mounted.current) return;
        if (reason instanceof Error && reason.message === PARAGRAPH_CONTRACT_ERROR) {
            setError("contractInvalid");
            setPlan(null);
            setPreview(null);
        } else if (reason instanceof ApiResponseError) {
            const code = reason.errorCode;
            setError(code === "WRITING_POLICY_CONFLICT" ? "policyConflict" : code === "WRITING_LANGUAGE_CONFLICT" ? "languageConflict" :
                code === "WRITING_ITEM_STALE" || code === "WRITING_PLAN_STALE" ? "stale" :
                    code === "WRITING_CONTENT_NOT_AVAILABLE" ? "unavailable" : "requestFailed");
            // 권한 상실이나 삭제 뒤에는 이전 원문을 계속 보여주지 않는다. 초안은 별도로 보존한다.
            if ([401, 403, 404].includes(reason.status)) {
                setPlan(null);
                setPreview(null);
            }
        } else {
            setError("requestFailed");
        }
    }, []);

    async function perform(operation: () => Promise<void>) {
        if (inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        setError(null);
        try {
            await operation();
        } catch (reason) {
            handleError(reason);
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    }

    useEffect(() => {
        let active = true;
        // 진입·새로고침은 설정과 저장 계획만 읽는다. 시작·복구·생성 요청을 자동으로 하지 않는다.
        service.config().then(async (loadedConfig) => {
            if (!active) return;
            setConfig(loadedConfig);
            setTarget(String(loadedConfig.defaultTargetItemCount));
            const savedId = new URL(window.location.href).searchParams.get("planId");
            if (savedId && /^-?\d+$/.test(savedId) && Number.isSafeInteger(Number(savedId))) {
                inFlight.current = true;
                setBusy(true);
                try {
                    const saved = await service.get(Number(savedId));
                    if (active) acceptPlan(saved);
                } catch (reason) {
                    if (active) handleError(reason);
                } finally {
                    inFlight.current = false;
                    if (active) setBusy(false);
                }
            }
        }).catch(() => {
            if (active) setConfigError(true);
        });
        return () => { active = false; };
    }, [acceptPlan, handleError, service]);

    function chooseType(next: DailyWritingType) {
        setType(next);
        setPlan(null);
        setPreview(null);
        setError(null);
        setPage(0);
        const url = new URL(window.location.href);
        url.searchParams.delete("planId");
        window.history.replaceState(null, "", url);
    }

    function changeDraft(item: ParagraphWritingItem, answer: string) {
        if (!plan) return;
        const key = paragraphDraftKey(owner, plan.dailySetId, item.itemId, item.contentRevision);
        setDrafts((previous) => ({ ...previous, [key]: answer }));
        try {
            writeParagraphDraft(window.localStorage, key, answer);
        } catch {
            setDraftUnavailable(true);
        }
    }

    if (!config) return <div>
        <p role={configError ? "alert" : "status"}>{t(configError ? "loadConfigFailed" : "loading")}</p>
        {configError && <button type="button" disabled={busy} className="mt-3 rounded-lg border p-2" onClick={() => void perform(async () => {
            const loaded = await service.config();
            setConfig(loaded);
            setTarget(String(loaded.defaultTargetItemCount));
            setConfigError(false);
        })}>{t("retryConfig")}</button>}
    </div>;

    const parsedTarget = parseParagraphTarget(target, config.minTargetItemCount, config.maxTargetItemCount);
    const items = plan ? [...plan.items].sort((a, b) => a.order - b.order) : [];
    const pages = Math.max(1, Math.ceil(items.length / config.pageSize));
    const currentPage = Math.min(page, pages - 1);

    return (
        <div className="space-y-5" data-testid="paragraph-writing-page" aria-busy={busy}>
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">{t("qaNotice")}</p>
            <ParagraphWritingControls config={config} type={type} target={target} parsedTarget={parsedTarget} rePractice={rePractice}
                historyDate={historyDate} busy={busy} plan={plan} preview={preview} onType={chooseType}
                onTarget={(value) => { setTarget(value); setPreview(null); }} onRePractice={(value) => { setRePractice(value); setPreview(null); }}
                onHistoryDate={setHistoryDate}
                onPreview={() => void perform(async () => { if (parsedTarget !== null) setPreview(await service.preview(type, parsedTarget, rePractice)); })}
                onStart={(allowPartial) => void perform(async () => {
                    if (preview && parsedTarget === preview.targetItemCount) {
                        acceptPlan(await service.start(type, parsedTarget, rePractice, allowPartial));
                        setPage(0);
                    }
                })}
                onExpand={() => void perform(async () => { if (plan && parsedTarget !== null) acceptPlan(await service.expand(plan.dailySetId, parsedTarget, plan.planRevision)); })}
                onRestore={() => void perform(async () => { if (plan) acceptPlan(await service.restore(plan.dailySetId, plan.planRevision)); })}
                onRefresh={() => void perform(async () => { if (plan) acceptPlan(await service.get(plan.dailySetId)); })}
                onHistory={() => void perform(async () => { acceptPlan(await service.history(historyDate, type)); setPage(0); })} />
            {busy && <p role="status">{t("loading")}</p>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-100">{t(error)}</p>}
            {draftUnavailable && <p role="alert">{t("draftUnavailable")}</p>}
            {plan && <>
                <ParagraphWritingProgress plan={plan} />
                <button type="button" disabled={busy} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50" onClick={() => {
                    if (!window.confirm(t("deleteConfirm"))) return;
                    void perform(async () => {
                        await service.delete(plan.dailySetId, plan.planRevision);
                        if (!mounted.current) return;
                        // 서버 삭제 성공 후 이 계획의 로컬 초안만 지우고, 다른 계획의 답안은 보존한다.
                        const removedKeys = plan.items.map((item) => paragraphDraftKey(owner, plan.dailySetId, item.itemId, item.contentRevision));
                        try { removedKeys.forEach((key) => window.localStorage.removeItem(key)); } catch { setDraftUnavailable(true); }
                        setDrafts((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !removedKeys.includes(key))));
                        setPlan(null);
                        setPreview(null);
                        setPage(0);
                        const url = new URL(window.location.href);
                        url.searchParams.delete("planId");
                        window.history.replaceState(null, "", url);
                    });
                }}>{t("deletePlan")}</button>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showWorkload} onChange={(event) => setShowWorkload(event.target.checked)} />{t("workloadPreview")}</label>
                {showWorkload && <p className="text-sm">{t("workloadNotice")}</p>}
                <nav className="flex flex-wrap items-center gap-3" aria-label={t("page", { page: currentPage + 1, pages, size: config.pageSize })}>
                    <button type="button" disabled={busy || currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">{t("previous")}</button>
                    <p>{t("page", { page: currentPage + 1, pages, size: config.pageSize })}</p>
                    <button type="button" disabled={busy || currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-50">{t("next")}</button>
                </nav>
                {items.slice(currentPage * config.pageSize, (currentPage + 1) * config.pageSize).map((item) => {
                    const key = paragraphDraftKey(owner, plan.dailySetId, item.itemId, item.contentRevision);
                    return <ParagraphWritingItemCard key={key} item={item} draft={drafts[key] ?? ""} maxLength={config.answerMaxLength}
                        busy={busy} showWorkload={showWorkload} onDraft={(answer) => changeDraft(item, answer)}
                        onRetryFeedback={(answerId) => void perform(async () => { acceptPlan(await service.retryFeedback(answerId)); })}
                        onSubmit={() => void perform(async () => {
                            const saved = await service.submit(item.itemId, drafts[key] ?? "", item.contentRevision);
                            acceptPlan(saved);
                            changeDraft(item, "");
                        })} />;
                })}
            </>}
        </div>
    );
}
