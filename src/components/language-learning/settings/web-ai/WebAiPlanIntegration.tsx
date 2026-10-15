"use client";

import { useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ClipboardCopy, Link2, LoaderCircle, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { parseWebAiResultImport } from "@/features/language-learning/web-ai/webAiApi";
import { Link } from "@/navigation";
import { createWebAiLearningService } from "@/services/language-learning/webAiLearningService";
import { getApiErrorCode } from "@/services/common/responseParser";
import type { WebAiConnection } from "@/types/language-learning/webAi";

const BUTTON = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200";

export function WebAiPlanIntegration({ planId, saved }: { planId: string; saved: boolean }) {
    const t = useTranslations("LanguageLearning.webAiWorkflow");
    const { data: session } = useSession();
    const api = useMemo(() => createWebAiLearningService(session?.loginSessionId), [session?.loginSessionId]);
    const [connection, setConnection] = useState<WebAiConnection | null>(null);
    const [runPrompt, setRunPrompt] = useState("");
    const [resultJson, setResultJson] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [resultStatus, setResultStatus] = useState<string | null>(null);
    const executionKey = useRef<string | null>(null);

    const perform = async (action: () => Promise<void>) => {
        if (busy) return;
        // 연동·가져오기 요청은 한 번에 하나씩 처리하고 실패 시 기존 입력과 프롬프트를 유지한다.
        setBusy(true);
        setNotice(null);
        try {
            await action();
        } catch (error) {
            const code = getApiErrorCode(error);
            setNotice(code && t.has(`error.${code}`) ? `error.${code}` : "actionFailed");
        } finally {
            setBusy(false);
        }
    };

    const createConnection = () => perform(async () => {
        // 연결 키는 이 컴포넌트의 메모리에만 두고 브라우저 저장소에는 기록하지 않는다.
        const created = await api.createConnection(planId);
        setConnection(created);
    });

    const revokeConnection = () => {
        if (!window.confirm(t("revokeConfirm"))) return;
        void perform(async () => {
            await api.revokeConnection(planId);
            setConnection(null);
            setNotice("connectionRevoked");
        });
    };

    const createRun = () => perform(async () => {
        // 통신 실패 후 재시도는 같은 실행 키를 써서 서버에 중복 학습 회차를 만들지 않는다.
        executionKey.current ??= crypto.randomUUID();
        const run = await api.createRun(planId, executionKey.current);
        setRunPrompt(run.prompt);
        executionKey.current = null;
    });

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setNotice("connectionCopied");
        } catch {
            setNotice("copyFailed");
        }
    };

    const importResult = () => {
        // 형식 오류는 전송 전에 안내한다. 실제 문항 검증과 점수 판정은 서버에서 수행한다.
        let body;
        try {
            body = parseWebAiResultImport(resultJson);
        } catch {
            setNotice("invalidJson");
            return;
        }
        void perform(async () => {
            const result = await api.importResult(body);
            setResultStatus(result.status);
            setNotice("resultSaved");
        });
    };

    return (
        <section className="space-y-4 rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-300/20 dark:bg-[#172a41] sm:p-5" data-testid="web-ai-plan-integration">
            <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" /><h3 className="text-sm font-black text-slate-950 dark:text-white">{t("connectionTitle")}</h3></div>
            <p className="text-xs leading-6 text-slate-500 dark:text-slate-300">{t(saved ? "connectionHelp" : "saveBeforeConnect")}</p>
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!saved || busy} onClick={() => void createConnection()} className={BUTTON}>{t(connection ? "rotateConnection" : "createConnection")}</button>
                <button type="button" disabled={!saved || busy} onClick={revokeConnection} className={BUTTON}>{t("revokeConnection")}</button>
            </div>
            {connection && (
                <div className="space-y-2 rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10">
                    <p className="text-xs leading-5 text-blue-800 dark:text-blue-200">{t("tokenHelp")}</p>
                    {["localhost", "127.0.0.1", "[::1]"].includes(new URL(connection.promptUrl).hostname) && <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">{t("localApiHelp")}</p>}
                    <textarea aria-label={t("connectionTitle")} readOnly value={connection.bootstrapPrompt} rows={7} className="w-full resize-y rounded-lg border border-blue-100 bg-white p-3 font-mono text-xs leading-5 text-slate-800 dark:border-blue-300/10 dark:bg-[#102135] dark:text-slate-200" />
                    <button type="button" disabled={!saved || busy} onClick={() => void copy(connection.bootstrapPrompt)} className={BUTTON}><ClipboardCopy className="h-4 w-4" aria-hidden="true" />{t("copy")}</button>
                </div>
            )}

            <details className="border-t border-slate-200 pt-3 dark:border-white/10">
                <summary className="cursor-pointer text-sm font-black text-slate-950 dark:text-white">{t("runTitle")}</summary>
                <div className="mt-3 space-y-3">
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-300">{t("runHelp")}</p>
                    <button type="button" disabled={!saved || busy} onClick={() => void createRun()} className={BUTTON}>{t("prepareRun")}</button>
                    {runPrompt && (
                        <div className="space-y-2">
                            <textarea aria-label={t("runPrompt")} readOnly value={runPrompt} rows={7} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 dark:border-white/10 dark:bg-[#102135] dark:text-slate-200" />
                            <button type="button" disabled={!saved || busy} onClick={() => void copy(runPrompt)} className={BUTTON}><ClipboardCopy className="h-4 w-4" aria-hidden="true" />{t("copy")}</button>
                        </div>
                    )}
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        {t("resultJson")}
                        <textarea value={resultJson} onChange={(event) => setResultJson(event.target.value)} placeholder={t("resultPlaceholder")} rows={7} disabled={busy} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800 dark:border-white/10 dark:bg-[#102135] dark:text-slate-200" />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" disabled={busy || !resultJson.trim()} onClick={importResult} className={BUTTON}><Upload className="h-4 w-4" aria-hidden="true" />{t("submitResult")}</button>
                        <Link href="/language-learning/history" className="text-xs font-bold text-blue-700 underline dark:text-blue-300">{t("openHistory")}</Link>
                    </div>
                </div>
            </details>
            {busy && <p role="status" className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{t("busy")}</p>}
            {notice && <p role={notice === "resultSaved" || notice === "connectionCopied" || notice === "connectionRevoked" ? "status" : "alert"} className="text-xs leading-6 text-slate-700 dark:text-slate-200">{t(notice)}</p>}
            {notice === "resultSaved" && resultStatus && <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{t("resultStatus", { status: t.has(`status.${resultStatus}`) ? t(`status.${resultStatus}`) : resultStatus })}</p>}
        </section>
    );
}
