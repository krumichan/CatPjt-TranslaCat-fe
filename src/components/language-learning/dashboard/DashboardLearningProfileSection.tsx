"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    DisclosureContent,
    DisclosureToggleButton,
} from "@/components/language-learning/common/LanguageLearningDisclosure";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningProfileView } from "@/components/language-learning/profile/LanguageLearningProfileView";
import type { LevelTestHistoryItem, LevelTestStatus } from "@/types/language-learning/level";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

interface DashboardLearningProfileSectionProps {
    profile: LanguageLearningProfile | null;
    levelStatus: LevelTestStatus | null;
    latestLevelTest: LevelTestHistoryItem | null;
    isLoading: boolean;
    loadError: boolean;
    onRetry: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

export function DashboardLearningProfileSection({
    profile,
    levelStatus,
    latestLevelTest,
    isLoading,
    loadError,
    onRetry,
    isOpen,
    onToggle,
}: DashboardLearningProfileSectionProps) {
    const t = useTranslations("LanguageLearning.profile");
    const common = useTranslations("LanguageLearning.common");
    const contentId = "dashboard-learning-profile-content";

    return (
        <section
            id="learning-profile"
            data-testid="dashboard-learning-profile"
            className="scroll-mt-28 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.025]"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                            {t("title")}
                        </h2>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>
                </div>
                <DisclosureToggleButton
                    isOpen={isOpen}
                    onToggle={onToggle}
                    expandLabel={common("accordion.expand")}
                    collapseLabel={common("accordion.collapse")}
                    controls={contentId}
                />
            </div>

            <DisclosureContent id={contentId} isOpen={isOpen} className="pt-5">
                {isLoading ? (
                    <LanguageLearningStateCard
                        variant="loading"
                        title={common("loadingTitle")}
                        message={t("loading")}
                    />
                ) : loadError || !profile ? (
                    <LanguageLearningStateCard
                        variant="error"
                        title={common("loadFailedTitle")}
                        message={t("loadFailed")}
                        actionLabel={common("retry")}
                        onAction={onRetry}
                    />
                ) : (
                    <LanguageLearningProfileView
                        profile={profile}
                        levelStatus={levelStatus}
                        latestLevelTest={latestLevelTest}
                    />
                )}
            </DisclosureContent>
        </section>
    );
}
