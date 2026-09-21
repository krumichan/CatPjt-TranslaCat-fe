"use client";

import { useTranslations } from "next-intl";
import type { SpeakingMetricType } from "@/types/language-learning/speaking";

export function SpeakingEvidenceNotice({ evidence, readAloud = false }: {
    evidence: {
        evidencePolicyVersion?: string | null;
        evidenceSource?: string | null;
        evaluatedAxes?: SpeakingMetricType[] | null;
        evaluationCoverage?: number | null;
    };
    readAloud?: boolean;
}) {
    const t = useTranslations("LanguageLearning.speaking.evaluation");
    // Do not relabel historical results whose original evidence policy is unknown.
    if (!evidence.evidencePolicyVersion) return null;
    return (
        <aside data-testid="speaking-evidence-policy" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            <h3 className="font-black">{t("evidencePolicyTitle")}</h3>
            {evidence.evidenceSource === "TRANSCRIPT_OBSERVATION" && <p>{t("transcriptOnlyNotice")}</p>}
            {readAloud && <p>{t("readAloudScriptAccuracyNotice")}</p>}
            {evidence.evaluationCoverage != null && (
                <p className="mt-2 font-bold">{t("evaluatedAxesCoverage", {
                    count: evidence.evaluatedAxes?.length ?? 0,
                    coverage: Math.round(evidence.evaluationCoverage * 100),
                })}</p>
            )}
            {!!evidence.evaluatedAxes?.length && <p>{evidence.evaluatedAxes.map((axis) => t(`metrics.${axis}`)).join(" · ")}</p>}
            <p className="mt-2 text-xs">{t("evidencePolicyVersion", { version: evidence.evidencePolicyVersion })}</p>
            <p className="text-xs">{t("scoreComparisonNotice")}</p>
        </aside>
    );
}
