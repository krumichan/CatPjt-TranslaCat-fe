import { X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import type {
    SttErrorReport,
    SttErrorReportCreateRequest,
    SttReportType,
} from "@/types/language-learning/speaking";

const REPORT_OPTIONS: Array<{
    key: string;
    value: SttReportType;
}> = [
    { key: "wrong", value: "WRONG_TEXT" },
    { key: "missing", value: "MISSING_TEXT" },
    { key: "language", value: "LANGUAGE_MISMATCH" },
    { key: "almostNone", value: "OTHER" },
    { key: "other", value: "OTHER" },
];

export function SttErrorReportModal({
    open,
    onClose,
    onSubmit,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (
        request: SttErrorReportCreateRequest,
    ) => Promise<SttErrorReport | null>;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.sttReport");
    const [optionKey, setOptionKey] = useState("wrong");
    const [expectedText, setExpectedText] = useState("");
    const [consent, setConsent] = useState(false);
    const [supportRequested, setSupportRequested] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitFailed, setSubmitFailed] = useState(false);

    if (!open || typeof document === "undefined") return null;

    const option = REPORT_OPTIONS.find((item) => item.key === optionKey)!;

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);
        setSubmitFailed(false);
        try {
            const report = await onSubmit({
                reportType: option.value,
                expectedText: expectedText.trim() || null,
                audioAnalysisConsent: consent,
                clientAudioMetadata: {
                    userAgent: navigator.userAgent,
                    uiReportType: optionKey,
                },
                supportRequested,
            });
            if (report) {
                onClose();
            } else {
                setSubmitFailed(true);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="stt-report-title"
                className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="stt-report-title" className="text-xl font-black text-slate-950 dark:text-white">
                            {t("title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("close")}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <fieldset className="mt-5 space-y-2">
                    <legend className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {t("type")}
                    </legend>
                    {REPORT_OPTIONS.map((item) => (
                        <label
                            key={item.key}
                            className="flex cursor-pointer gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200"
                        >
                            <input
                                type="radio"
                                name="stt-report-type"
                                checked={optionKey === item.key}
                                onChange={() => setOptionKey(item.key)}
                                className="mt-0.5 h-4 w-4 text-blue-600"
                            />
                            {t(`types.${item.key}`)}
                        </label>
                    ))}
                </fieldset>

                <label className="mt-5 block">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {t("expectedText")}
                    </span>
                    <textarea
                        value={expectedText}
                        onChange={(event) => setExpectedText(event.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder={t("expectedTextPlaceholder")}
                        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-white"
                    />
                    <span className="mt-1 block text-xs text-slate-400">
                        {t("expectedTextHelp")}
                    </span>
                </label>

                <div className="mt-5 space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                        <input
                            type="checkbox"
                            checked={consent}
                            onChange={(event) => setConsent(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded text-blue-600"
                        />
                        <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {t("consent")}
                        </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                        <input
                            type="checkbox"
                            checked={supportRequested}
                            onChange={(event) => setSupportRequested(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded text-blue-600"
                        />
                        <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {t("support")}
                        </span>
                    </label>
                </div>

                {submitFailed && (
                    <p
                        role="alert"
                        className="mt-5 text-sm font-bold text-rose-600 dark:text-rose-300"
                    >
                        {t("submitFailed")}
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 dark:bg-white/10 dark:text-slate-200"
                    >
                        {t("cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={submitting}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                    >
                        {submitting ? t("submitting") : t("submit")}
                    </button>
                </div>
            </section>
        </div>,
        document.body,
    );
}
