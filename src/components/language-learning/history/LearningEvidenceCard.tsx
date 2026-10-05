"use client";

import { useTranslations } from "next-intl";

import type { LearningEvidenceItem } from "@/types/language-learning/historyEvidence";

export function LearningEvidenceCard({ item, onOpen }: { item: LearningEvidenceItem; onOpen: (activityId: string) => void }) {
    const t = useTranslations("LanguageLearning.history.evidence");
    const sourceT = useTranslations("LanguageLearning.history.unified.source");
    const kind = ["SCORED_EVALUATION", "SESSION_COACHING"].includes(item.resultKind) ? item.resultKind : "UNKNOWN";

    return (
        <article data-testid={`evidence-${item.activityId}`} className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{sourceT(item.source)}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10">{t(`kind.${kind}`)}</span>
                {item.availability === "LIMITED" && <span className="text-amber-700 dark:text-amber-300">{t("limited")}</span>}
            </div>
            <h3 className="mt-2 break-words font-bold text-slate-900 dark:text-white">{item.title}</h3>
            <dl className="mt-3 grid gap-1 text-xs text-slate-500 dark:text-slate-400">
                <div><dt className="inline font-bold">{t("date")} · </dt><dd className="inline">{item.learningDate}</dd></div>
                <div><dt className="inline font-bold">{t("languages")} · </dt><dd className="inline">{item.originLanguage ?? t("unknown")} → {item.learningLanguage ?? t("unknown")}</dd></div>
                <div className="break-all"><dt className="inline font-bold">{t("policy")} · </dt><dd className="inline">{item.policyVersion ?? t("unknown")}</dd></div>
                <div className="break-all"><dt className="inline font-bold">{t("status")} · </dt><dd className="inline">{item.status}{item.resultStatus ? ` / ${item.resultStatus}` : ""}</dd></div>
            </dl>
            {item.limitations.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-amber-800 dark:text-amber-200">
                    {item.limitations.map((limitation, index) => (
                        <li key={`${limitation}-${index}`}>{t.has(`limitation.${limitation}`) ? t(`limitation.${limitation}`) : t("otherLimitation", { code: limitation })}</li>
                    ))}
                </ul>
            )}
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.detailAvailable ? t("reviewReason") : t("unavailable")}</p>
            <button
                type="button"
                disabled={!item.detailAvailable}
                onClick={() => onOpen(item.activityId)}
                className="mt-2 rounded-lg border border-blue-300 px-3 py-2 text-sm font-bold text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-200"
            >
                {t("review")}
            </button>
        </article>
    );
}
