"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import type { ListeningResultController } from "@/hooks/language-learning/listening/useListeningResultController";
import type { ListeningEvaluationReportReason } from "@/types/language-learning/listening";

export function ListeningEvaluationReportModal({
    taskResponseId,
    audioExpired,
    controller,
    onClose,
}: {
    taskResponseId: number;
    audioExpired: boolean;
    controller: ListeningResultController;
    onClose: () => void;
}) {
    const t = useTranslations("LanguageLearning.listening.result.report");
    const [reason, setReason] = useState<ListeningEvaluationReportReason>("STT_INCORRECT");
    const [comment, setComment] = useState("");
    const [consent, setConsent] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async () => {
        const ok = await controller.report(taskResponseId, reason, comment, audioExpired ? false : consent);
        if (ok) setSubmitted(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
        }}>
            <section role="dialog" aria-modal="true" aria-labelledby="listening-report-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <h2 id="listening-report-title" className="text-xl font-black text-slate-900 dark:text-white">{t("title")}</h2>
                {submitted ? (
                    <div className="mt-5">
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{t("submitted")}</p>
                        <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">{t("close")}</button>
                    </div>
                ) : (
                    <div className="mt-5 space-y-4">
                        <label className="block">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t("reason")}</span>
                            <AppSelect value={reason} onChange={(event) => setReason(event.target.value as ListeningEvaluationReportReason)} className="mt-2">
                                <option value="STT_INCORRECT">{t("reasonOption.STT_INCORRECT")}</option>
                                <option value="PRONUNCIATION_EVALUATION_INCORRECT">{t("reasonOption.PRONUNCIATION_EVALUATION_INCORRECT")}</option>
                                <option value="OTHER">{t("reasonOption.OTHER")}</option>
                            </AppSelect>
                        </label>
                        <label className="block">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{t("comment")}</span>
                            <textarea rows={4} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-black/20 dark:text-white" />
                        </label>
                        <label className={`flex items-start gap-3 rounded-2xl border p-4 ${audioExpired ? "opacity-50" : ""}`}>
                            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={audioExpired} className="mt-1" />
                            <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">{audioExpired ? t("expiredConsent") : t("consent")}</span>
                        </label>
                        {controller.errorCode && <p role="alert" className="text-sm font-bold text-rose-600">{t("failed")}</p>}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-500">{t("cancel")}</button>
                            <button type="button" onClick={() => void submit()} disabled={controller.busyKey !== null} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{t("submit")}</button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
