"use client";

import { Ear, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { useListeningLandingController } from "@/hooks/language-learning/listening/useListeningLandingController";
import { Link } from "@/navigation";

export function ListeningLandingPage() {
    const t = useTranslations("LanguageLearning.listening");
    const common = useTranslations("LanguageLearning.common");
    const controller = useListeningLandingController();

    const content = (() => {
        if (controller.entry.isLoading || controller.isLoading) {
            return <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("landing.loading")} />;
        }
        if (controller.entry.settingError || controller.entry.levelStatusError || controller.loadError) {
            return <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("landing.loadFailed")} actionLabel={common("retry")} onAction={() => void controller.reload()} />;
        }
        if (!controller.entry.setting?.configured) return <LanguageLearningOnboardingCard mode="SETTING" />;
        if (controller.entry.levelStatus?.profileState === "LEVEL_TEST_REQUIRED") return <LanguageLearningOnboardingCard mode="LEVEL_TEST" />;
        if (!controller.policy?.enabled) {
            return <LanguageLearningStateCard variant="error" title={t("landing.disabledTitle")} message={t("landing.disabledDescription")} />;
        }
        if (!controller.today) return null;

        const set = controller.today;
        const percent = set.targetItemCount <= 0 ? 0 : Math.round((set.completedItemCount / set.targetItemCount) * 100);
        return (
            <div className="space-y-5" data-testid="listening-landing-page">
                {controller.activeSession && (
                    <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-400/20 dark:bg-blue-500/10">
                        <p className="font-black text-blue-900 dark:text-blue-100">{t("landing.resumeTitle")}</p>
                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">{t("landing.resumeDescription")}</p>
                        <Link href={`/language-learning/listening/session/${controller.activeSession.sessionId}`} className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500">
                            {t("landing.resume")}
                        </Link>
                    </section>
                )}

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Ear className="h-5 w-5 text-blue-600" aria-hidden="true" />
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">{t("landing.todayTitle")}</h2>
                            </div>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(`difficulty.${set.difficulty}`)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-slate-950 dark:text-white">{set.completedItemCount} / {set.targetItemCount}</p>
                            <p className="text-xs font-bold text-slate-400">{t(`dailyStatus.${set.status}`)}</p>
                        </div>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-label={t("landing.progressAria")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, percent)}%` }} />
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{t("landing.readyCount", { ready: set.readyItemCount, physical: set.physicalItemCount })}</p>

                    {["GENERATING", "PARTIAL"].includes(set.status) && (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-300">
                            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            {t("landing.generating")}
                        </div>
                    )}

                    <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {set.items.map((item) => (
                            <div key={item.itemId} className="rounded-2xl border border-slate-100 p-3 dark:border-white/10">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">#{item.itemIndex}</span>
                                    <span className="text-xs font-bold text-slate-400">{t(`itemStatus.${item.status}`)}</span>
                                </div>
                                {item.status === "NOT_EVALUABLE" && (
                                    <button type="button" onClick={() => void controller.retryTts(item.itemId)} className="mt-3 text-xs font-black text-blue-600 hover:text-blue-500 dark:text-blue-300">
                                        {t("landing.retryTts")}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {!controller.activeSession && controller.todayCompleted && (
                        <Link
                            href={controller.completedSessionId
                                ? `/language-learning/listening/session/${controller.completedSessionId}/result`
                                : "/language-learning/history"}
                            data-testid="listening-result-link"
                            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500"
                        >
                            {t("landing.result")}
                        </Link>
                    )}

                    {!controller.activeSession && !controller.todayCompleted && set.readyItemCount > 0 && (
                        <Link href="/language-learning/listening/setup" data-testid="listening-start-link" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-500">
                            {t("landing.start")}
                        </Link>
                    )}
                </section>
            </div>
        );
    })();

    return <LanguageLearningPageLayout title={t("title")} description={t("description")}>{content}</LanguageLearningPageLayout>;
}
