"use client";

import { Check, Headphones, Languages, Mic2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { useListeningSetupController } from "@/hooks/language-learning/listening/useListeningSetupController";
import { Link } from "@/navigation";
import type { ListeningTaskType } from "@/types/language-learning/listening";

const TASKS: Array<[ListeningTaskType, typeof Headphones]> = [
    ["DICTATION", Headphones],
    ["INTERPRETATION", Languages],
    ["REPEAT_AFTER_AUDIO", Mic2],
];

export function ListeningSetupPage() {
    const t = useTranslations("LanguageLearning.listening");
    const common = useTranslations("LanguageLearning.common");
    const controller = useListeningSetupController();

    if (controller.entry.isLoading || controller.isLoading) {
        return <LanguageLearningPageLayout title={t("setup.title")} description={t("setup.description")}><LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("setup.loading")} /></LanguageLearningPageLayout>;
    }
    if (controller.entry.settingError || controller.entry.levelStatusError || controller.loadError || !controller.today) {
        return <LanguageLearningPageLayout title={t("setup.title")} description={t("setup.description")}><LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("setup.loadFailed")} actionLabel={common("retry")} onAction={() => void controller.reload()} /></LanguageLearningPageLayout>;
    }
    if (!controller.entry.setting?.configured) {
        return <LanguageLearningPageLayout title={t("setup.title")} description={t("setup.description")}><LanguageLearningOnboardingCard mode="SETTING" /></LanguageLearningPageLayout>;
    }
    if (controller.entry.levelStatus?.profileState === "LEVEL_TEST_REQUIRED") {
        return <LanguageLearningPageLayout title={t("setup.title")} description={t("setup.description")}><LanguageLearningOnboardingCard mode="LEVEL_TEST" /></LanguageLearningPageLayout>;
    }

    return (
        <LanguageLearningPageLayout title={t("setup.title")} description={t("setup.description")}>
            <div className="space-y-5" data-testid="listening-setup-page">
                {controller.activeSession && (
                    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-400/20 dark:bg-blue-500/10">
                        <h2 className="font-black text-blue-900 dark:text-blue-100">{t("setup.activeTitle")}</h2>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">{t("setup.activeDescription")}</p>
                        <Link
                            href={`/language-learning/listening/session/${controller.activeSession.sessionId}`}
                            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white"
                        >
                            {t("setup.activeAction")}
                        </Link>
                    </section>
                )}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {t("setup.dailySummary", { count: controller.today.targetItemCount, difficulty: t(`difficulty.${controller.today.difficulty}`) })}
                    </p>
                    <fieldset className="mt-5">
                        <legend className="text-lg font-black text-slate-900 dark:text-white">{t("setup.taskLegend")}</legend>
                        <p id="listening-selection-rule" className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("setup.selectionRule")}</p>
                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
                            {TASKS.map(([task, Icon]) => {
                                const checked = controller.selectedTasks.includes(task);
                                return (
                                    <label key={task} data-testid={`listening-task-option-${task}`} className={`relative cursor-pointer rounded-2xl border p-4 transition ${checked ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-slate-200 hover:border-slate-300 dark:border-white/10"}`}>
                                        <input type="checkbox" className="sr-only" checked={checked} disabled={controller.activeSession !== null} onChange={() => controller.toggleTask(task)} aria-describedby="listening-selection-rule" />
                                        <div className="flex items-start gap-3">
                                            <Icon className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden="true" />
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-900 dark:text-white">{t(`task.${task}`)}</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(`setup.taskDescription.${task}`)}</p>
                                            </div>
                                            {checked && <Check className="ml-auto h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                    {!controller.isValid && controller.selectedTasks.length > 0 && (
                        <p role="alert" className="mt-4 text-sm font-bold text-rose-600 dark:text-rose-300">{t("setup.invalidSelection")}</p>
                    )}
                    {controller.errorCode && (
                        <p role="alert" className="mt-4 text-sm font-bold text-rose-600 dark:text-rose-300">{t(`errors.${controller.errorCode}`)}</p>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button type="button" onClick={() => void controller.start()} disabled={controller.activeSession !== null || controller.today.readyItemCount <= 0 || !controller.isValid || controller.isStarting} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                            {controller.isStarting ? t("setup.starting") : t("setup.start")}
                        </button>
                    </div>
                </section>
            </div>
        </LanguageLearningPageLayout>
    );
}
