"use client";

import { Eye, Gauge, Lightbulb, Tags } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ListeningSessionController } from "@/hooks/language-learning/listening/useListeningSessionController";

export function ListeningAssistancePanel({ controller }: { controller: ListeningSessionController }) {
    const t = useTranslations("LanguageLearning.listening.session.assistance");
    const attempt = controller.attempt;
    if (!attempt) return null;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-base font-black text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void controller.recordAssistance("TOPIC_HINT")} disabled={controller.isAssistanceBusy || attempt.answerRevealed} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                    <Lightbulb className="h-4 w-4" aria-hidden="true" /> {t("topicHint")}
                </button>
                <button type="button" onClick={() => void controller.recordAssistance("KEYWORD_HINT")} disabled={controller.isAssistanceBusy || attempt.answerRevealed} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                    <Tags className="h-4 w-4" aria-hidden="true" /> {t("keywordHint")}
                </button>
                <button type="button" onClick={() => {
                    if (window.confirm(t("answerConfirm"))) void controller.revealAnswer();
                }} disabled={attempt.answerRevealed || controller.isAssistanceBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-200">
                    <Eye className="h-4 w-4" aria-hidden="true" /> {t("showAnswer")}
                </button>
            </div>
            {controller.assistanceNotice && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300" role="status" data-testid="listening-assistance-result">
                    <p>
                        <Gauge className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                        {t(`used.${controller.assistanceNotice}`)}
                    </p>
                    {controller.assistanceNotice === "TOPIC_HINT" && (
                        <p className="mt-2">
                            {controller.item?.topicHint
                                ? t("topicHintValue", { value: controller.item.topicHint })
                                : t("hintUnavailable")}
                        </p>
                    )}
                    {controller.assistanceNotice === "KEYWORD_HINT" && (
                        <p className="mt-2">
                            {controller.item?.keywordHints?.length
                                ? t("keywordHintValue", { value: controller.item.keywordHints.join(" · ") })
                                : t("hintUnavailable")}
                        </p>
                    )}
                </div>
            )}
            {controller.revealedAnswer && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10" data-testid="listening-revealed-answer">
                    <p className="text-xs font-black text-amber-700 dark:text-amber-200">{t("practiceBadge")}</p>
                    {(controller.item?.sourceText ?? controller.revealedAnswer.sourceText) && (
                        <>
                            <p className="mt-3 text-xs font-black text-amber-700 dark:text-amber-200">{t("sourceAnswer")}</p>
                            <p className="mt-1 font-bold leading-7 text-slate-900 dark:text-white">{controller.item?.sourceText ?? controller.revealedAnswer.sourceText}</p>
                        </>
                    )}
                    {controller.item?.correctOptionKey && (
                        <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm font-bold text-slate-800 dark:bg-black/10 dark:text-slate-100">
                            {t("correctChoice", {
                                key: controller.item.correctOptionKey,
                                value: controller.item.options.find((option) => option.key === controller.item?.correctOptionKey)?.text ?? controller.item.correctOptionKey,
                            })}
                        </div>
                    )}
                    {(controller.item?.summaryKeyPoints?.length ?? 0) > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-black text-amber-700 dark:text-amber-200">{t("summaryKeyPoints")}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                                {controller.item!.summaryKeyPoints.map((point) => <li key={point}>{point}</li>)}
                            </ul>
                        </div>
                    )}
                    {(controller.item?.referenceMeanings?.length ?? controller.revealedAnswer.referenceMeanings.length) > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-black text-amber-700 dark:text-amber-200">{t("referenceMeanings")}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                                {(controller.item?.referenceMeanings ?? controller.revealedAnswer.referenceMeanings).map((meaning) => <li key={meaning}>{meaning}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
