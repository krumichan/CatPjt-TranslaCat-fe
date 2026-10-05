"use client";

import { useTranslations } from "next-intl";
import type { ParagraphWritingPlan } from "@/types/language-learning/paragraphWriting";

export function ParagraphWritingProgress({ plan }: { plan: ParagraphWritingPlan }) {
    const t = useTranslations("ParagraphWriting");
    const counts = [
        ["targetCount", plan.targetItemCount], ["acquiredCount", plan.acquiredItemCount],
        ["submittedCount", plan.submittedItemCount], ["feedbackCount", plan.feedbackCompletedItemCount],
        ["remainingCount", plan.remainingItemCount],
    ] as const;

    return (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900" aria-label={t("statuses." + plan.status)} data-testid="paragraph-progress">
            <h2 className="font-bold">{plan.learningDate} · {t(`types.${plan.writingType}`)} · {t(`statuses.${plan.status}`)}</h2>
            <p className="text-sm">{t("languagePair", { origin: plan.originLanguage, learning: plan.learningLanguage })}</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {counts.map(([key, count]) => <div key={key}><dt className="text-sm">{t(key)}</dt><dd className="text-xl font-bold" data-testid={`paragraph-${key}`}>{count}</dd></div>)}
            </dl>
            <p className="text-sm">{t(plan.personalizedFeedbackStatus === "ACTIVE_QA" ? "feedbackActive" : "feedbackDisabled")}</p>
            <p className="text-sm">{t("noScore")}</p>
            {plan.supplyStopReason && <p role="status" className="text-sm">{t(`supplyStops.${plan.supplyStopReason}`)}</p>}
            {plan.remainingItemCount > 0 && <div role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                <p>{t("partialNotice")}</p>
                <p className="mt-2 font-semibold">{t("shortages")}</p>
                <ul>{plan.shortages.map((shortage) => <li key={`${shortage.difficulty}-${shortage.targetBand}`}>
                    {t("shortage", { difficulty: t(`difficulty.${shortage.difficulty}`), band: shortage.targetBand, count: shortage.missingCount })}
                </li>)}</ul>
            </div>}
            <p className="text-sm">{t("distributionDeviation")}: {(["REVIEW", "NORMAL", "CHALLENGE"] as const).map((difficulty) =>
                `${t(`difficulty.${difficulty}`)} ${plan.actualDistribution[difficulty]}/${plan.desiredDistribution[difficulty]} (${plan.distributionDeviation[difficulty] > 0 ? "+" : ""}${plan.distributionDeviation[difficulty]})`,
            ).join(" · ")}</p>
        </section>
    );
}
