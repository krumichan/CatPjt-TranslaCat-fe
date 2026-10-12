"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";

import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import type { useUrgentNotices } from "@/hooks/support/useUrgentNotices";
import type { SupportNotice } from "@/types/support";

export function UrgentNoticeModal({ controller, notice }: {
    controller: ReturnType<typeof useUrgentNotices>;
    notice: SupportNotice;
}) {
    const t = useTranslations("Support.urgentModal");
    const format = useFormatter();
    const titleId = useId();
    const dialogRef = useRef<HTMLElement>(null);
    useModalFocusTrap(true, dialogRef, controller.close);

    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-busy={controller.isSaving}
                data-testid="urgent-notice-modal"
                className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl dark:border-orange-400/20 dark:bg-slate-950"
            >
                <header className="shrink-0 border-b border-slate-100 p-5 sm:p-6 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 dark:bg-orange-400/10 dark:text-orange-300">
                            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            {t("label")}
                        </span>
                        {controller.remaining > 1 && <span className="text-xs text-slate-500">{t("remaining", { count: controller.remaining })}</span>}
                    </div>
                    <h2 id={titleId} className="mt-4 break-words text-xl font-bold leading-8 text-slate-900 dark:text-white">{notice.title}</h2>
                    <time dateTime={notice.createdAt} className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                        {format.dateTime(new Date(notice.createdAt), { dateStyle: "medium" })}
                    </time>
                </header>

                <div
                    role="region"
                    aria-label={t("content")}
                    tabIndex={0}
                    className="min-h-0 overflow-y-auto p-5 sm:p-6"
                >
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{notice.content}</p>
                </div>

                <footer className="shrink-0 border-t border-slate-100 p-5 sm:p-6 dark:border-white/10">
                    {controller.hasError && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-300">{t("saveError")}</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            disabled={controller.isSaving}
                            onClick={() => void controller.dismiss()}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                        >
                            {controller.isSaving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t(controller.isSaving ? "saving" : "dismiss")}
                        </button>
                        <button
                            type="button"
                            disabled={controller.isSaving}
                            onClick={controller.close}
                            className="min-h-11 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                            {t("close")}
                        </button>
                    </div>
                </footer>
            </section>
        </div>,
        document.body,
    );
}
