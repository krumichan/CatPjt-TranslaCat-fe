"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ClipboardCopy, Link2, LoaderCircle, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { parseWebAiResultImport } from "@/features/language-learning/web-ai/webAiApi";
import { Link } from "@/navigation";
import { createWebAiLearningService } from "@/services/language-learning/webAiLearningService";
import { getApiErrorCode } from "@/services/common/responseParser";
import type { WebAiPlanTransfer } from "@/hooks/language-learning/useWebAiPlanTransfer";

const BUTTON = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200";

export function WebAiPlanIntegration({ saved, ready = true, transfer, onCopy, onAction, onPrerequisitesChanged }: {
    saved: boolean;
    ready?: boolean;
    transfer: WebAiPlanTransfer;
    onCopy: () => void;
    onAction: () => void;
    onPrerequisitesChanged?: () => void;
}) {
    const t = useTranslations("LanguageLearning.webAiWorkflow");
    const { data: session } = useSession();
    const api = useMemo(() => createWebAiLearningService(session?.loginSessionId), [session?.loginSessionId]);
    const [resultJson, setResultJson] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [resultStatus, setResultStatus] = useState<string | null>(null);
    const connection = transfer.connection;
    const working = busy || transfer.busy;

    const perform = async (action: () => Promise<void>) => {
        if (working) return;
        // 연동·가져오기 요청은 한 번에 하나씩 처리하고 실패 시 기존 입력과 프롬프트를 유지한다.
        setBusy(true);
        setNotice(null);
        onAction();
        try {
            await action();
        } catch (error) {
            const code = getApiErrorCode(error);
            setNotice(code && t.has(`error.${code}`) ? `error.${code}` : "actionFailed");
            if (code === "WEB_AI_SETTINGS_REQUIRED" || code === "WEB_AI_KEYWORDS_REQUIRED") onPrerequisitesChanged?.();
        } finally {
            setBusy(false);
        }
    };

    const createConnection = () => perform(async () => {
        if (!ready) return;
        // 같은 연결을 상단 복사와 공유한다. 기존 키 교체는 사용자에게 효과를 알린 뒤 수행한다.
        if (connection) {
            if (!window.confirm(t("rotateConfirm"))) return;
            await transfer.rotate();
        }
        await transfer.prepare();
        setNotice("promptPrepared");
    });

    const revokeConnection = () => {
        if (!window.confirm(t("revokeConfirm"))) return;
        void perform(async () => {
            await transfer.revoke();
            setNotice("connectionRevoked");
        });
    };

    const createRun = () => perform(async () => {
        if (!ready) return;
        if (transfer.prompt) await transfer.renew();
        else await transfer.prepare();
        setNotice("promptPrepared");
    });

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
            <p className="text-xs leading-6 text-amber-800 dark:text-amber-200">{t("connectionPreparationHelp")}</p>
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!saved || !ready || working} onClick={() => void createConnection()} className={BUTTON}>{t(connection ? "rotateConnection" : "createConnection")}</button>
                <button type="button" disabled={!saved || working} onClick={revokeConnection} className={BUTTON}>{t("revokeConnection")}</button>
            </div>
            {connection && ready && (
                <div className="space-y-2 rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10">
                    <p className="text-xs leading-5 text-blue-800 dark:text-blue-200">{t("tokenHelp")}</p>
                    {["localhost", "127.0.0.1", "[::1]"].includes(new URL(connection.promptUrl).hostname) && <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">{t("localApiHelp")}</p>}
                    <p className="text-xs leading-5 text-blue-800 dark:text-blue-200">{t("preparedInPreview")}</p>
                    <button type="button" disabled={!saved || !transfer.prompt || working} onClick={onCopy} className={BUTTON}><ClipboardCopy className="h-4 w-4" aria-hidden="true" />{t("copy")}</button>
                </div>
            )}

            <details className="border-t border-slate-200 pt-3 dark:border-white/10">
                <summary className="cursor-pointer text-sm font-black text-slate-950 dark:text-white">{t("runTitle")}</summary>
                <div className="mt-3 space-y-3">
                    <p className="text-xs leading-6 text-slate-500 dark:text-slate-300">{t("runHelp")}</p>
                    <button type="button" disabled={!saved || !ready || working} onClick={() => void createRun()} className={BUTTON}>{t(transfer.prompt ? "newManualRun" : "prepareRun")}</button>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        {t("resultJson")}
                        <textarea value={resultJson} onChange={(event) => setResultJson(event.target.value)} placeholder={t("resultPlaceholder")} rows={7} disabled={working} className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800 dark:border-white/10 dark:bg-[#102135] dark:text-slate-200" />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" disabled={working || !resultJson.trim()} onClick={importResult} className={BUTTON}><Upload className="h-4 w-4" aria-hidden="true" />{t("submitResult")}</button>
                        <Link href="/language-learning/history" className="text-xs font-bold text-blue-700 underline dark:text-blue-300">{t("openHistory")}</Link>
                    </div>
                </div>
            </details>
            {working && <p role="status" className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{t("busy")}</p>}
            {notice && <p role={notice === "resultSaved" || notice === "promptPrepared" || notice === "connectionRevoked" ? "status" : "alert"} className="text-xs leading-6 text-slate-700 dark:text-slate-200">{t(notice)}</p>}
            {notice === "resultSaved" && resultStatus && <p className="text-xs font-bold text-blue-700 dark:text-blue-300">{t("resultStatus", { status: t.has(`status.${resultStatus}`) ? t(`status.${resultStatus}`) : resultStatus })}</p>}
        </section>
    );
}
