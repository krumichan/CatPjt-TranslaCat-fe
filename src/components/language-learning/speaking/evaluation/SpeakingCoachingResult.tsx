"use client";

import { Lightbulb, MessageSquareQuote } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SpeakingCoachingResult } from "@/types/language-learning/speaking";

export function SpeakingCoachingResultView({
    result,
    history = false,
}: {
    result: SpeakingCoachingResult;
    history?: boolean;
}) {
    const t = useTranslations("LanguageLearning.speaking.evaluation.coaching");
    const turnPrefix = history ? "history-speaking-turn" : "speaking-turn";

    return (
        <section data-testid="speaking-coaching-result" className="rounded-3xl border border-violet-200 bg-white p-6 dark:border-violet-400/20 dark:bg-slate-900">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t("title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t("description")}</p>
            {/* 생성 당시 상태와 조회 시점의 원본 사용 가능 여부를 구분한다. */}
            {(result.evidenceAvailability === "LIMITED" || result.evidenceAvailability === "UNAVAILABLE") && (
                <div role="status" data-testid="speaking-coaching-evidence-availability" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <p className="font-bold">{result.evidenceAvailability === "UNAVAILABLE" ? t("sourceUnavailable") : t("sourceLimited")}</p>
                    {Boolean(result.evidenceLimitations?.length) && (
                        <ul className="mt-2 space-y-1 text-xs">
                            {result.evidenceLimitations?.map((reason, index) => (
                                <li key={`${reason}-${index}`}>{t.has(`sourceReasons.${reason}`) ? t(`sourceReasons.${reason}`) : t("sourceLimitation", { reason })}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {result.contentStatus !== "GROUNDED" && (
                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    {result.contentStatus === "NO_USABLE_EVIDENCE" ? t("noEvidence") : t("limited")}
                </p>
            )}
            <div className="mt-5 space-y-4">
                {result.items.map((item) => (
                    <article key={item.observationId} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                        <p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">
                            {t(`kinds.${item.kind}`)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">{item.message}</p>
                        <button
                            type="button"
                            onClick={() => document.getElementById(`${turnPrefix}-${item.evidence.turnId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                            className="mt-3 flex w-full items-start gap-2 rounded-xl bg-slate-50 p-3 text-left text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300"
                        >
                            <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <span><span className="font-black">{t("recognizedSpeech")}</span> · “{item.evidence.transcriptExcerpt}”</span>
                        </button>
                        {item.evidence.sourceProvenance === "AUTOMATIC_SPEECH_RECOGNITION"
                            && !item.evidence.verbatimAccuracyVerified && (
                            <p data-testid="speaking-coaching-asr-caution" className="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                                {t("asrCaution")}
                            </p>
                        )}
                        {item.suggestedExpression && (
                            <div className="mt-2 flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span><span className="font-black">{t("suggestion")}</span> · {item.suggestedExpression}</span>
                            </div>
                        )}
                    </article>
                ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-400">{t("notScore")}</p>
        </section>
    );
}
