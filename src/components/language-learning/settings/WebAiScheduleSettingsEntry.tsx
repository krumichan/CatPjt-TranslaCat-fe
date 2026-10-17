"use client";

import { ArrowRight, CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";

import { GuideHelpLink } from "@/components/common/GuideHelpLink";
import { Link } from "@/navigation";
import { WebAiPlanPrerequisiteChecklist } from "@/components/language-learning/settings/web-ai/WebAiPlanPrerequisiteChecklist";
import { useWebAiPlanPrerequisites } from "@/hooks/language-learning/useWebAiPlanPrerequisites";

export function WebAiScheduleSettingsEntry() {
    const t = useTranslations("LanguageLearning.settings.webAiEntry");
    const prerequisites = useWebAiPlanPrerequisites();

    return (
        <section className="space-y-5 rounded-3xl border border-blue-200 bg-blue-50/80 p-6 shadow-sm dark:border-blue-400/20 dark:bg-blue-500/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200">
                        <CalendarDays className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                        <div className="flex items-start gap-3">
                            <h2 className="min-w-0 text-lg font-black text-slate-950 dark:text-white">{t("title")}</h2>
                            <GuideHelpLink topic="language-learning/web-ai" className="shrink-0" />
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("description")}</p>
                    </div>
                </div>
                {prerequisites.ready ? (
                    <Link
                        href="/language-learning/settings/web-ai"
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                    >
                        {t("action")}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                ) : (
                    <button type="button" disabled aria-describedby="web-ai-setup-help" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white opacity-45 disabled:cursor-not-allowed">
                        {t("action")}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>
            <div id="web-ai-setup-help"><WebAiPlanPrerequisiteChecklist prerequisites={prerequisites} localLinks /></div>
        </section>
    );
}
