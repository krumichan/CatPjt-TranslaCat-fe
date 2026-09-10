"use client";

import type { SttErrorReport } from "@/types/language-learning/speaking";
import { CheckCircle2, Headphones } from "lucide-react";
import { useTranslations } from "next-intl";

export function SttReportComplete({
    report: completedReport,
    supportSubmitting: requestingSupport,
    supportFailed: requestFailed,
    onRequestSupport: requestSupportAction,
    onClose: close,
}: {
    report: SttErrorReport;
    supportSubmitting: boolean;
    supportFailed: boolean;
    onRequestSupport: () => Promise<void>;
    onClose: () => void;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.sttReport");
    return (
        <div className="mt-6">
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <div className="flex gap-3">
                    <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300"
                        aria-hidden="true"
                    />
                    <div>
                        <p className="font-black text-emerald-800 dark:text-emerald-100">
                            {t("created")}
                        </p>
                        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                            {t("reference", {
                                reference: completedReport.reportReference,
                            })}
                        </p>
                    </div>
                </div>
            </div>

            {completedReport.supportRequested ? (
                <div className="mt-4 rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/10">
                    <p className="font-black text-blue-800 dark:text-blue-100">
                        {t("supportCreated")}
                    </p>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">
                        {t("supportReference", {
                            reference:
                                completedReport.supportReference ?? "—",
                        })}
                    </p>
                </div>
            ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {t("supportDescription")}
                    </p>
                    <button
                        type="button"
                        onClick={() => void requestSupportAction()}
                        disabled={requestingSupport}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                    >
                        <Headphones
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                        {requestingSupport
                            ? t("supportSubmitting")
                            : t("supportAction")}
                    </button>
                    {requestFailed && (
                        <p
                            role="alert"
                            className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300"
                        >
                            {t("supportFailed")}
                        </p>
                    )}
                </div>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={close}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white dark:bg-white dark:text-slate-900"
                >
                    {t("done")}
                </button>
            </div>
        </div>
    );
}
