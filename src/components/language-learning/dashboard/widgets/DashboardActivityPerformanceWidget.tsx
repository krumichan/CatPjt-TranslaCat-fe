"use client";

import { BookOpen, Ear, Mic2, PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    DisclosureContent,
    DisclosureToggleButton,
    type DisclosureControlProps,
} from "@/components/language-learning/common/LanguageLearningDisclosure";
import { DashboardActivityPerformanceCard } from "@/components/language-learning/dashboard/widgets/DashboardActivityPerformanceCard";
import type { DashboardActivityPerformance } from "@/types/language-learning/dashboard";

const ITEMS = [
    ["writing", PencilLine, "/language-learning/writing"],
    ["speaking", Mic2, "/language-learning/speaking"],
    ["listening", Ear, "/language-learning/listening"],
    ["reading", BookOpen, null],
] as const;

export function DashboardActivityPerformanceWidget({
    data,
    disclosure,
}: {
    data: DashboardActivityPerformance;
    disclosure: DisclosureControlProps;
}) {
    const t = useTranslations("LanguageLearning.dashboard.v3");
    const contentId = "dashboard-activity-performance-content";

    return (
        <section data-testid="dashboard-learning-progress-v2">
            <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600 dark:text-blue-300">
                        {t("activity.eyebrow")}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                        {t("activity.title")}
                    </h2>
                </div>
                <DisclosureToggleButton {...disclosure} controls={contentId} compact />
            </div>
            <DisclosureContent id={contentId} isOpen={disclosure.isOpen}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {ITEMS.map(([key, Icon, href]) => (
                        <DashboardActivityPerformanceCard
                            key={key}
                            name={key}
                            icon={Icon}
                            data={data[key]}
                            href={href}
                        />
                    ))}
                </div>
            </DisclosureContent>
        </section>
    );
}
