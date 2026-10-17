"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ClipboardCopy, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { FeedbackMarkdown } from "@/components/language-learning/history/FeedbackMarkdown";
import { createWebAiLearningService } from "@/services/language-learning/webAiLearningService";
import { getApiErrorCode } from "@/services/common/responseParser";
import type { WebAiResult } from "@/types/language-learning/webAi";
import { webAiVerificationPollDelay } from "@/features/language-learning/web-ai/verificationPolling";

export function WebAiResultDetail({ result, onReload }: { result: WebAiResult; onReload: (signal?: AbortSignal) => Promise<void> }) {
    const t = useTranslations("LanguageLearning.webAiWorkflow");
    const areaT = useTranslations("LanguageLearning.settings.webAi.areas");
    const { data: session } = useSession();
    const api = useMemo(() => createWebAiLearningService(session?.loginSessionId), [session?.loginSessionId]);
    const [tab, setTab] = useState<"structured" | "original">("structured");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pausedResultId, setPausedResultId] = useState<string | null>(null);
    const [pollRevision, setPollRevision] = useState(0);
    const reloadRef = useRef(onReload);
    const pending = result.status === "PENDING" || result.status === "VERIFYING";
    const statusLabel = (status: string) => t.has(`status.${status}`) ? t(`status.${status}`) : status;

    useEffect(() => {
        reloadRef.current = onReload;
    }, [onReload]);

    useEffect(() => {
        if (!pending || !session?.loginSessionId) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let activeRequest: AbortController | null = null;
        let attempt = 0;
        const startedAt = Date.now();

        // 완료 상태가 오거나 화면·계정이 바뀌면 예약과 진행 중인 상세 조회를 함께 취소한다.
        const scheduleNext = () => {
            if (cancelled) return;
            const delay = webAiVerificationPollDelay(attempt, Date.now() - startedAt);
            if (delay === null) {
                setPausedResultId(result.id);
                return;
            }
            timer = setTimeout(() => { void poll(); }, delay);
        };
        const poll = async () => {
            if (cancelled) return;
            attempt += 1;
            const controller = new AbortController();
            activeRequest = controller;
            const requestTimeout = setTimeout(() => controller.abort(), 15_000);
            try {
                await reloadRef.current(controller.signal);
            } catch {
                // 일시적 읽기 실패는 다음 읽기로 회복하며 유료 검증 요청을 자동 실행하지 않는다.
            } finally {
                clearTimeout(requestTimeout);
                activeRequest = null;
                scheduleNext();
            }
        };
        scheduleNext();

        return () => {
            cancelled = true;
            if (timer !== undefined) clearTimeout(timer);
            activeRequest?.abort();
        };
    }, [result.id, pending, session?.loginSessionId, pollRevision]);

    const retry = async () => {
        setBusy(true);
        setError(null);
        try {
            // 취소된 요청의 lease가 만료됐으면 같은 저장 결과만 재검증한다. 원문을 다시 제출하지 않는다.
            await api.retryResult(result.id);
            await onReload();
            setPausedResultId(null);
            setPollRevision((value) => value + 1);
        } catch (failure) {
            const code = getApiErrorCode(failure);
            setError(code === "WEB_AI_CONFLICT" ? "verificationConflict" : code && t.has(`error.${code}`) ? `error.${code}` : "actionFailed");
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(result.originalFeedbackMarkdown);
        } catch {
            setError("copyFailed");
        }
    };

    const reload = async () => {
        setError(null);
        try {
            await onReload();
            setPausedResultId(null);
            setPollRevision((value) => value + 1);
        } catch {
            setError("actionFailed");
        }
    };

    return (
        <article className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6" data-testid="web-ai-history-detail">
            <header>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">{t("webAiBadge")}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">{statusLabel(result.status)}</span></div>
                <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">{result.planName}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{result.learningDate ?? result.createdAt.slice(0, 10)} · {result.originLanguage} → {result.learningLanguage}</p>
                {pending && pausedResultId === result.id && <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{t("autoRefreshPaused")}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void reload()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-slate-200"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />{t("reload")}</button>
                    {result.items.some((item) => item.status === "FAILED" || item.status === "PENDING") && <button type="button" disabled={busy} onClick={() => void retry()} className="min-h-9 rounded-lg bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-50">{t("retryVerification")}</button>}
                </div>
            </header>

            <div role="tablist" aria-label={t("structuredTab")} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                {(["structured", "original"] as const).map((value) => <button key={value} id={`web-ai-result-tab-${value}`} aria-controls={`web-ai-result-panel-${value}`} role="tab" aria-selected={tab === value} type="button" onClick={() => setTab(value)} className={`min-h-11 rounded-lg text-sm font-black ${tab === value ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200" : "text-slate-500 dark:text-slate-400"}`}>{t(value === "structured" ? "structuredTab" : "originalTab")}</button>)}
            </div>

            {tab === "original" ? (
                <section role="tabpanel" id="web-ai-result-panel-original" aria-labelledby="web-ai-result-tab-original" className="min-w-0">
                    {result.originalFeedbackMarkdown ? <><button type="button" onClick={() => void copy()} className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"><ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />{t("originalCopy")}</button><FeedbackMarkdown markdown={result.originalFeedbackMarkdown} /></> : <p className="text-sm text-slate-500">{t("noOriginal")}</p>}
                </section>
            ) : (
                <section role="tabpanel" id="web-ai-result-panel-structured" aria-labelledby="web-ai-result-tab-structured" className="space-y-6">
                    {result.items.map((verified, index) => {
                        const { item, feedback } = verified;
                        return (
                            <section key={item.itemId} className="space-y-4 border-t border-slate-200 pt-5 first:border-t-0 first:pt-0 dark:border-white/10">
                                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-slate-950 dark:text-white">#{index + 1} · {areaT.has(item.areaCode) ? areaT(item.areaCode) : item.areaCode}</h3><span className="text-xs font-bold text-blue-700 dark:text-blue-300">{verified.officialScore == null ? statusLabel(verified.status) : `${t("officialScore")} ${verified.officialScore} / 100`}</span></div>
                                <div><p className="text-xs font-black text-slate-500">{t("question")}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">{item.promptText}</p></div>
                                <div><p className="text-xs font-black text-slate-500">{t("answer")}</p><blockquote className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-800 dark:bg-white/5 dark:text-slate-100">{item.answerText}</blockquote></div>
                                {feedback.summary && <FeedbackMarkdown markdown={feedback.summary} />}
                                {(["strengths", "improvements"] as const).map((field) => feedback[field]?.length ? <div key={field}><h4 className="text-sm font-black text-slate-900 dark:text-white">{t(field)}</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{feedback[field]!.map((text, textIndex) => <li key={textIndex}>{text}</li>)}</ul></div> : null)}
                                {feedback.corrections?.length ? <div><h4 className="mb-2 text-sm font-black text-slate-900 dark:text-white">{t("corrections")}</h4><div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10"><table className="w-full min-w-[27rem] text-left text-sm"><thead className="bg-slate-50 dark:bg-white/5"><tr>{(["original", "corrected", "correctionReason"] as const).map((heading) => <th key={heading} scope="col" className="px-3 py-2 font-black">{t(heading)}</th>)}</tr></thead><tbody>{feedback.corrections.map((correction, correctionIndex) => <tr key={correctionIndex} className="border-t border-slate-100 dark:border-white/5"><td className="px-3 py-2 align-top">{correction.original}</td><td className="px-3 py-2 align-top font-bold">{correction.corrected}</td><td className="px-3 py-2 align-top">{correction.explanation}</td></tr>)}</tbody></table></div></div> : null}
                                {feedback.recommendedAnswers?.length ? <div><h4 className="mb-2 text-sm font-black text-slate-900 dark:text-white">{t("recommendedAnswer")}</h4>{feedback.recommendedAnswers.map((text, answerIndex) => <div key={answerIndex} className="mb-2 rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10"><FeedbackMarkdown markdown={text} /></div>)}</div> : null}
                                {feedback.explanation && feedback.explanation !== feedback.summary && <div><h4 className="mb-2 text-sm font-black text-slate-900 dark:text-white">{t("explanation")}</h4><FeedbackMarkdown markdown={feedback.explanation} /></div>}
                                {!feedback.summary && !feedback.explanation && !feedback.corrections?.length && <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">{verified.reason && t.has(`reason.${verified.reason}`) ? t(`reason.${verified.reason}`) : t("noFeedback")}</p>}
                            </section>
                        );
                    })}
                </section>
            )}
            {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">{t(error)}</p>}
        </article>
    );
}
