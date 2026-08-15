"use client";

import { useTranslations } from "next-intl";

import { SkillRadarChart } from "@/components/language-learning/common/SkillRadarChart";
import { DashboardWidgetCard } from "@/components/language-learning/dashboard/widgets/DashboardWidgetCard";
import type { SkillScores } from "@/types/language-learning/profile";

export function DashboardSkillRadarWidget({ scores }: { scores: SkillScores }) {
    const t = useTranslations("LanguageLearning.dashboard.widgets.radar");

    return (
        <DashboardWidgetCard title={t("title")} description={t("description")}>
            <SkillRadarChart scores={scores} />
        </DashboardWidgetCard>
    );
}
