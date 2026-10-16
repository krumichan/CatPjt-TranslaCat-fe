"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ClipboardCopy, Save } from "lucide-react";
import { useTranslations } from "next-intl";

interface WebAiScheduleEditorFooterProps {
    onSave: () => void;
    onCopy: () => void;
    canCopy: boolean;
    canSave?: boolean;
    issues: string[];
    notice: "saved" | "saveFailed" | "copied" | "copyFailed" | null;
    busy?: boolean;
}

const subscribeToPortal = () => () => {};
const getPortalElement = () => document.getElementById("bottom-ui-portal");
const getServerPortalElement = () => null;

export function WebAiScheduleEditorFooter({
    onSave,
    onCopy,
    canCopy,
    canSave = true,
    issues,
    notice,
    busy = false,
}: WebAiScheduleEditorFooterProps) {
    const t = useTranslations("LanguageLearning.settings.webAi");
    const workflow = useTranslations("LanguageLearning.webAiWorkflow");
    const portalElement = useSyncExternalStore(
        subscribeToPortal,
        getPortalElement,
        getServerPortalElement,
    );
    const isSuccess = notice === "saved" || notice === "copied";

    // AppShell의 하단 포털은 스크롤·transform 밖에 고정되고 사이드바 너비도 반영한다.
    if (!portalElement) return null;

    return createPortal(
        <footer
            aria-label={t("saveDraft")}
            data-testid="web-ai-schedule-footer"
            className="pointer-events-auto relative z-50 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur [--color-blue-500:#3188ff] [--color-blue-600:#1677ff] dark:border-blue-300/15 dark:bg-[#172a41]/95 sm:px-6 lg:px-8"
        >
            <div className="mx-auto w-full max-w-7xl">
                {/* 입력 오류와 저장·복사 결과는 고정 영역에서 한 번만 안내한다. */}
                {issues.length > 0 && (
                    <div role="alert" className="mb-3 max-h-24 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                        <p className="font-black">{t("validationTitle")}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {issues.map((issue) => <li key={issue}>{t(`validation.${issue}`)}</li>)}
                        </ul>
                    </div>
                )}
                {notice && (
                    <p role={isSuccess ? "status" : "alert"} className={`mb-3 text-xs font-bold leading-5 ${isSuccess
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"}`}>
                        {notice === "saved" ? workflow("saved") : notice === "saveFailed" ? workflow("actionFailed") : t(`notice.${notice}`)}
                    </p>
                )}

                {/* 모바일은 저장을 넓게 배치하고, 넓은 화면에서는 복사와 나란히 제공한다. */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <p id="web-ai-save-help" className="order-2 text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400 sm:order-1 sm:flex-1 sm:text-left sm:text-xs">
                        {workflow("serverNoticeTitle")}
                    </p>
                    <div className="order-1 flex w-full items-center gap-2 sm:order-2 sm:w-auto">
                        <button type="button" onClick={onCopy} disabled={!canCopy || busy} className="hidden min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200 sm:inline-flex">
                            <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                            {t("copyPrompt")}
                        </button>
                        <button type="button" disabled={busy || !canSave} onClick={onSave} aria-describedby="web-ai-save-help" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 sm:min-h-11 sm:w-auto">
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {busy ? workflow("saving") : t("saveDraft")}
                        </button>
                    </div>
                </div>
            </div>
        </footer>,
        portalElement,
    );
}
