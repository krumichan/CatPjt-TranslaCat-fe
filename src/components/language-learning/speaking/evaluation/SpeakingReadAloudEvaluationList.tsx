"use client";

import { useTranslations } from "next-intl";
import { SpeakingReadAloudEvaluationItem } from "@/components/language-learning/speaking/evaluation/SpeakingReadAloudEvaluationItem";
import type { SpeakingEvaluationController } from "@/hooks/language-learning/speaking/useSpeakingEvaluationController";

export function SpeakingReadAloudEvaluationList({ controller }: { controller: SpeakingEvaluationController }) {
    const t = useTranslations("LanguageLearning.speaking.evaluation.problemResults");
    const items = controller.session?.readAloudProblemEvaluations ?? [];
    if (controller.session?.session.practiceMode !== "READ_ALOUD" || items.length === 0) return null;
    return (
        <section data-testid="speaking-problem-results" className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
            <div className="mt-4 space-y-3">
                {items.map((item) => (
                    <SpeakingReadAloudEvaluationItem key={item.problemIndex} item={item}
                        retrying={controller.retryingProblems.has(item.problemIndex)}
                        retryError={controller.problemRetryErrors.has(item.problemIndex)}
                        onRetry={(index) => { void controller.retryProblem(index); }} />
                ))}
            </div>
        </section>
    );
}
