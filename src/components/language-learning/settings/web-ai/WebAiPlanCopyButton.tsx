"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ClipboardCopy, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useWebAiPlanTransfer, type WebAiPlanTransferStore } from "@/hooks/language-learning/useWebAiPlanTransfer";
import { getApiErrorCode } from "@/services/common/responseParser";
import type { createWebAiLearningService } from "@/services/language-learning/webAiLearningService";
import type { WebAiPlan } from "@/types/language-learning/webAi";

interface WebAiPlanCopyButtonProps {
    plan: WebAiPlan;
    store: WebAiPlanTransferStore;
    contextKey: string;
    locale: "ko" | "ja" | "learning";
    api: ReturnType<typeof createWebAiLearningService>;
    disabled: boolean;
    onPrerequisitesChanged?: () => void;
}

const PRIMARY_BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON = "inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200";

export function WebAiPlanCopyButton({ plan, store, contextKey, locale, api, disabled, onPrerequisitesChanged }: WebAiPlanCopyButtonProps) {
    const t = useTranslations("LanguageLearning.settings.webAi");
    const workflow = useTranslations("LanguageLearning.webAiWorkflow");
    const transfer = useWebAiPlanTransfer({ store, plan, contextKey, locale, api });
    const dialog = useRef<HTMLDialogElement>(null);
    const textarea = useRef<HTMLTextAreaElement>(null);
    const mounted = useRef(false);
    const copying = useRef(false);
    const currentContext = useRef(`${plan.id}:${contextKey}`);
    const titleId = useId();
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<"copied" | "copyFailed" | "prepareFailed" | null>(null);
    const working = busy || transfer.busy;

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        currentContext.current = `${plan.id}:${contextKey}`;
    }, [plan.id, contextKey]);

    const copyPrompt = async () => {
        if (disabled || transfer.busy || copying.current || !dialog.current) return;

        // 카드에서 편집기로 이동하지 않고 실제 전송문을 연다. 준비된 문구는 같은 클릭에서 복사한다.
        if (!dialog.current.open) dialog.current.showModal();
        copying.current = true;
        setBusy(true);
        setNotice(null);
        const requestContext = `${plan.id}:${contextKey}`;
        const isCurrent = () => mounted.current && dialog.current?.open && currentContext.current === requestContext;
        let text = transfer.prompt;

        try {
            // API 준비 실패와 클립보드 권한 거부는 구분한다. 재시도에는 공유된 연결·회차를 재사용한다.
            if (!text) {
                try {
                    text = (await transfer.prepare()) ?? "";
                    if (!text) throw new Error("WEB_AI_PROMPT_EMPTY");
                } catch (error) {
                    if (isCurrent()) setNotice("prepareFailed");
                    const code = getApiErrorCode(error);
                    if (mounted.current && (code === "WEB_AI_SETTINGS_REQUIRED" || code === "WEB_AI_KEYWORDS_REQUIRED")) {
                        onPrerequisitesChanged?.();
                    }
                    return;
                }
            }

            // 대화상자나 카드가 사라졌거나 설정이 바뀐 늦은 응답은 클립보드에 쓰지 않는다.
            if (!isCurrent()) return;
            try {
                await navigator.clipboard.writeText(text);
                if (isCurrent()) setNotice("copied");
            } catch {
                if (isCurrent()) setNotice("copyFailed");
            }
        } finally {
            copying.current = false;
            if (mounted.current) setBusy(false);
        }
    };

    return (
        <>
            <button type="button" data-testid="web-ai-plan-copy" disabled={disabled || working} onClick={() => void copyPrompt()} className={`${PRIMARY_BUTTON} w-full`}>
                <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                {t("copyPrompt")}
            </button>

            {/* 네이티브 top layer는 고정 헤더·하단 메뉴보다 위에서 배경 포커스를 차단한다. */}
            <dialog
                ref={dialog}
                data-testid="web-ai-plan-copy-dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onCancel={(event) => { if (working) event.preventDefault(); }}
                className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-blue-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/60 dark:border-blue-300/20 dark:bg-[#172a41] dark:text-white"
            >
                <div className="space-y-4 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <h2 id={titleId} className="min-w-0 break-words text-lg font-black">{t("copyPrompt")} · {plan.name}</h2>
                        <button type="button" aria-label={t("closeCopyPrompt")} disabled={working} onClick={() => dialog.current?.close()} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10">
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <p className="text-xs leading-6 text-amber-800 dark:text-amber-200">{workflow("connectionPreparationHelp")}</p>
                    {working && <p role="status" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-200"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{workflow("busy")}</p>}
                    {notice && <p role={notice === "copied" ? "status" : "alert"} className={`text-sm font-bold leading-6 ${notice === "copied" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{t(`notice.${notice}`)}</p>}

                    {transfer.prompt && (
                        <div className="space-y-2">
                            <p className="text-xs leading-6 text-slate-500 dark:text-slate-300">{t("actualPromptHelp")}</p>
                            <textarea ref={textarea} aria-label={t("actualPrompt")} value={transfer.prompt} readOnly spellCheck={false} className="h-[40dvh] min-h-40 max-h-96 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-6 text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-white/10 dark:bg-[#102135] dark:text-slate-200" />
                        </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                        {transfer.prompt && <button type="button" disabled={working} onClick={() => { textarea.current?.focus(); textarea.current?.select(); }} className={SECONDARY_BUTTON}>{t("selectPrompt")}</button>}
                        <button type="button" disabled={disabled || working} onClick={() => void copyPrompt()} className={PRIMARY_BUTTON}><ClipboardCopy className="h-4 w-4" aria-hidden="true" />{t("copyPrompt")}</button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
