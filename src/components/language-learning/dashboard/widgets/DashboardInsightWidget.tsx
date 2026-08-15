"use client";

import { useTranslations } from "next-intl";

import { SignalList } from "@/components/language-learning/common/SignalList";
import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

export function DashboardInsightWidget({ profile }: { profile: LanguageLearningProfile }) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.insight");

    return (
        <DashboardWidgetCard title={t("title")} description={t("description")}>
            <div className="grid gap-5 md:grid-cols-3">
                <div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                        {t("strengths")}
                    </h3>
                    <SignalList items={profile.strengths} emptyText={t("empty")} />
                </div>
                <div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-rose-600 dark:text-rose-300">
                        {t("weaknesses")}
                    </h3>
                    <SignalList items={profile.weaknesses} emptyText={t("empty")} />
                </div>
                <div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                        {t("focus")}
                    </h3>
                    <SignalList items={profile.recommendedFocus} emptyText={t("empty")} />
                </div>
            </div>
        </DashboardWidgetCard>
    );
}
