"use client";

import { AlertTriangle, LoaderCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { SpeakingEvaluationResult } from "@/components/language-learning/speaking/evaluation/SpeakingEvaluationResult";
import type { SpeakingEvaluationController } from "@/hooks/language-learning/speaking/useSpeakingEvaluationController";

export function SpeakingEvaluationView({
    controller,
}: {
    controller: SpeakingEvaluationController;
}) {
    const t = useTranslations("LanguageLearning.speaking.evaluation");
    const evaluation = controller.evaluation;
    const status = evaluation?.status ?? controller.session?.session.evaluationStatus;

    if (controller.isPending || status === "NOT_REQUESTED") {
        return (
            <section data-testid="speaking-evaluation-pending" className="rounded-3xl border border-blue-200 bg-white p-10 text-center dark:border-blue-400/20 dark:bg-slate-900">
                <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-blue-600" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{t("pendingTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t("pendingDescription")}</p>
            </section>
        );
    }

    if (status === "FAILED") {
        return (
            <section className="rounded-3xl border border-rose-200 bg-white p-8 text-center dark:border-rose-400/20 dark:bg-slate-900">
                <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{t("failedTitle")}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("failedDescription")}</p>
                <button type="button" disabled={controller.isRetrying} onClick={() => void controller.retry()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {controller.isRetrying ? t("retrying") : t("retry")}
                </button>
                {controller.retryError && <p role="alert" className="mt-3 text-sm font-bold text-rose-600">{t("retryFailed")}</p>}
            </section>
        );
    }

    if (status === "INSUFFICIENT_EVIDENCE") {
        return (
            <section data-testid="speaking-evaluation-insufficient" className="rounded-3xl border border-amber-200 bg-white p-8 text-center dark:border-amber-400/20 dark:bg-slate-900">
                <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{t("insufficientTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t("insufficientDescription")}</p>
            </section>
        );
    }

    return <SpeakingEvaluationResult controller={controller} />;
}
