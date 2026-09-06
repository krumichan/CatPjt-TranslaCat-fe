"use client";

import { useTranslations } from "next-intl";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { ListeningAssistancePanel } from "@/components/language-learning/listening/session/ListeningAssistancePanel";
import { ListeningChoiceAnswerPanel } from "@/components/language-learning/listening/session/ListeningChoiceAnswerPanel";
import { ListeningRepeatRecorderPanel } from "@/components/language-learning/listening/session/ListeningRepeatRecorderPanel";
import { ListeningTextAnswerPanel } from "@/components/language-learning/listening/session/ListeningTextAnswerPanel";
import { ReferenceAudioPlayer } from "@/components/language-learning/listening/session/ReferenceAudioPlayer";
import { useListeningSessionController } from "@/hooks/language-learning/listening/useListeningSessionController";
import { Link } from "@/navigation";

export function ListeningSessionPage({ sessionId }: { sessionId: number }) {
    const t = useTranslations("LanguageLearning.listening");
    const common = useTranslations("LanguageLearning.common");
    const controller = useListeningSessionController(sessionId);

    if (controller.isLoading) {
        return <LanguageLearningPageLayout title={t("session.title")} description={t("session.description")}><LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("session.loading")} /></LanguageLearningPageLayout>;
    }
    if (controller.loadError || !controller.session) {
        return <LanguageLearningPageLayout title={t("session.title")} description={t("session.description")}><LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("session.loadFailed")} actionLabel={common("retry")} onAction={() => void controller.reload()} /></LanguageLearningPageLayout>;
    }
    if (controller.session.status === "ABANDONED" || controller.actionErrorCode === "LISTENING_SESSION_EXPIRED") {
        return (
            <LanguageLearningPageLayout title={t("session.title")} description={t("session.description")}>
                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-400/20 dark:bg-amber-500/10">
                    <h2 className="text-xl font-black text-amber-900 dark:text-amber-100">{t("session.expiredTitle")}</h2>
                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{t("session.expiredDescription")}</p>
                    <Link href="/language-learning/listening" className="mt-4 inline-flex rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white">{t("session.newSession")}</Link>
                </section>
            </LanguageLearningPageLayout>
        );
    }

    if (!controller.attempt || !controller.item) {
        return (
            <LanguageLearningPageLayout title={t("session.title")} description={t("session.description")}>
                <LanguageLearningStateCard
                    variant="loading"
                    title={t("session.allItemsDone")}
                    message={t("session.redirectingToResult")}
                />
            </LanguageLearningPageLayout>
        );
    }

    const item = controller.item;
    const attempt = controller.attempt;
    const session = controller.session;
    const evaluating = ["SUBMITTED", "EVALUATING"].includes(attempt.status);

    return (
        <LanguageLearningPageLayout title={t("session.title")} description={t("session.description")}>
            <div className="space-y-5" data-testid="listening-session-page">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase text-slate-400">{t("session.itemProgress", { current: item.itemIndex, total: session.attempts.filter((candidate) => candidate.evaluationPurpose === "OFFICIAL").length })}</p>
                            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                                {evaluating
                                    ? t("session.evaluatingTitle")
                                    : controller.selectedTaskTypes.map((task) => t(`task.${task}`)).join(" · ")}
                            </h2>
                        </div>
                        <div className="text-right text-xs font-bold text-slate-400">
                            <p>{t("session.progressCount", { completed: controller.progressedItemCount, total: session.attempts.filter((candidate) => candidate.evaluationPurpose === "OFFICIAL").length })}</p>
                            <p className="mt-1">{t(`attemptStatus.${attempt.status}`)}</p>
                        </div>
                    </div>
                </section>

                <ReferenceAudioPlayer
                    loading={controller.referenceAudioLoading}
                    playbackRate={controller.playbackRate}
                    onPlay={(audio, slow) => controller.playReference(audio, slow)}
                />

                {!evaluating && (
                    <>
                        {controller.selectedTaskTypes.includes("DICTATION") && (
                            <ListeningTextAnswerPanel
                                taskType="DICTATION"
                                value={controller.drafts.DICTATION ?? ""}
                                disabled={attempt.answerRevealed}
                                originLanguage={controller.entry?.setting?.originLanguage ?? ""}
                                learningLanguage={controller.entry?.setting?.learningLanguage ?? ""}
                                onChange={(value) => controller.updateDraft("DICTATION", value)}
                            />
                        )}
                        {controller.selectedTaskTypes.includes("INTERPRETATION") && (
                            <ListeningTextAnswerPanel
                                taskType="INTERPRETATION"
                                value={controller.drafts.INTERPRETATION ?? ""}
                                disabled={attempt.answerRevealed}
                                originLanguage={controller.entry?.setting?.originLanguage ?? ""}
                                learningLanguage={controller.entry?.setting?.learningLanguage ?? ""}
                                onChange={(value) => controller.updateDraft("INTERPRETATION", value)}
                            />
                        )}
                        {controller.selectedTaskTypes.includes("COMPREHENSION") && (
                            <ListeningChoiceAnswerPanel
                                question={item.question}
                                options={item.options}
                                value={controller.drafts.COMPREHENSION ?? ""}
                                disabled={attempt.answerRevealed}
                                correctOptionKey={item.correctOptionKey}
                                onChange={(value) => controller.updateDraft("COMPREHENSION", value)}
                            />
                        )}
                        {controller.selectedTaskTypes.includes("SUMMARY") && (
                            <ListeningTextAnswerPanel
                                taskType="SUMMARY"
                                value={controller.drafts.SUMMARY ?? ""}
                                disabled={attempt.answerRevealed}
                                originLanguage={controller.entry?.setting?.originLanguage ?? ""}
                                learningLanguage={controller.entry?.setting?.learningLanguage ?? ""}
                                onChange={(value) => controller.updateDraft("SUMMARY", value)}
                            />
                        )}
                        {controller.selectedTaskTypes.includes("REPEAT_AFTER_AUDIO") && <ListeningRepeatRecorderPanel controller={controller} />}
                        <ListeningAssistancePanel controller={controller} />
                    </>
                )}

                {evaluating && (
                    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-400/20 dark:bg-blue-500/10" aria-live="polite" data-testid="listening-evaluating">
                        <p className="text-lg font-black text-blue-900 dark:text-blue-100">{t("session.evaluatingTitle")}</p>
                        <p className="mt-2 text-sm font-bold text-blue-700 dark:text-blue-200">{t("session.evaluatingDescription")}</p>
                    </section>
                )}

                {controller.actionErrorCode && controller.actionErrorCode !== "LISTENING_SESSION_EXPIRED" && (
                    <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                        {t(`errors.${controller.actionErrorCode}`)}
                    </p>
                )}

                {!evaluating && (
                    <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
                        {attempt.answerRevealed ? (
                            <>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-200">{t("session.answerReviewNotice")}</p>
                                <button type="button" onClick={() => void controller.continueAfterReveal()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500">
                                    {t("session.nextAfterReveal")}
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => {
                                    if (window.confirm(t("session.skipConfirm"))) void controller.skip();
                                }} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
                                    {t("session.skip")}
                                </button>
                                <button type="button" onClick={() => void controller.submit()} disabled={!controller.canSubmit} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                                    {controller.isSubmitting ? t("session.submitting") : t("session.submit")}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </LanguageLearningPageLayout>
    );
}
