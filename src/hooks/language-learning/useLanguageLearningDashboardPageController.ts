"use client";

import { useCallback, useState } from "react";

import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { useQuery } from "@/hooks/useQuery";
import { languageLearningDashboardService } from "@/services/language-learning/languageLearningDashboardService";
import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";
import { languageLearningProfileService } from "@/services/language-learning/languageLearningProfileService";
import { listeningService } from "@/services/language-learning/listeningService";
import type { DashboardPeriod, DashboardSourceFilter } from "@/types/language-learning/dashboard";

export function useLanguageLearningDashboardPageController() {
    const entry = useLanguageLearningEntryState();
    const [period, setPeriod] = useState<DashboardPeriod>("30d");
    const [source, setSource] = useState<DashboardSourceFilter>("ALL");
    const [dismissingId, setDismissingId] = useState<number | null>(null);

    // 예약 언어는 적용 전까지 사용하지 않고, 현재 활성 언어쌍별로 읽기 캐시를 분리한다.
    const originLanguage = entry.setting?.originLanguage;
    const learningLanguage = entry.setting?.learningLanguage;
    const canLoadLearningData = entry.setting?.configured === true && !!originLanguage && !!learningLanguage &&
        entry.levelStatus?.profileState !== "LEVEL_TEST_REQUIRED";

    const dashboardQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-dashboard", period, source, originLanguage, learningLanguage] as const) : null,
        fetcher: (_key, selectedPeriod, selectedSource) => languageLearningDashboardService.get(selectedPeriod, selectedSource),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true, keepPreviousData: false },
    });

    const profileQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-dashboard-profile", originLanguage, learningLanguage] as const) : null,
        fetcher: () => languageLearningProfileService.get(),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true, keepPreviousData: false },
    });

    const levelHistoryQuery = useQuery({
        keys: canLoadLearningData ? (["language-learning-dashboard-level-history", originLanguage, learningLanguage] as const) : null,
        fetcher: () => languageLearningLevelService.getHistory(),
        enabled: canLoadLearningData,
        config: { revalidateOnMount: true, keepPreviousData: false },
    });

    // 늦은 응답이 현재 언어와 다르면 점수·차트와 언어 태그 없는 프로필을 함께 노출하지 않는다.
    const dashboard = canLoadLearningData && dashboardQuery.data?.learningLanguage === learningLanguage
        ? dashboardQuery.data
        : null;
    const profile = dashboard ? profileQuery.data ?? null : null;

    // 전체 이력은 보존하되 현재 언어의 최근 측정에 다른 언어 점검을 연결하지 않는다.
    const latestLevelTest = canLoadLearningData
        ? levelHistoryQuery.data?.find((item) =>
            !!item.originLanguage && !!item.learningLanguage &&
            item.originLanguage === entry.setting?.originLanguage &&
            item.learningLanguage === entry.setting?.learningLanguage,
        ) ?? null
        : null;

    const dismissRecommendation = useCallback(async (recommendationId: number) => {
        if (dismissingId !== null) return false;
        setDismissingId(recommendationId);
        try {
            await listeningService.dismissRecommendation(recommendationId);
            await dashboardQuery.mutate(undefined, true);
            return true;
        } catch (error) {
            console.error("Failed to dismiss language learning recommendation.", error);
            return false;
        } finally {
            setDismissingId(null);
        }
    }, [dashboardQuery, dismissingId]);

    const reloadProfile = useCallback(async () => {
        await Promise.all([
            profileQuery.mutate(undefined, true),
            levelHistoryQuery.mutate(undefined, true),
            entry.reload(),
        ]);
    }, [entry, levelHistoryQuery, profileQuery]);

    return {
        entry,
        dashboard,
        profile,
        latestLevelTest,
        period,
        source,
        setPeriod,
        setSource,
        dismissingId,
        dismissRecommendation,
        isLoadingData: canLoadLearningData && (dashboardQuery.isLoading || (!dashboard && dashboardQuery.isValidating)),
        loadError: dashboardQuery.isError,
        isLoadingProfile: canLoadLearningData && profileQuery.isLoading,
        profileLoadError: Boolean(profileQuery.isError),
        reloadProfile,
        reloadData: async () => {
            await Promise.all([
                dashboardQuery.mutate(undefined, true),
                profileQuery.mutate(undefined, true),
                levelHistoryQuery.mutate(undefined, true),
            ]);
        },
    };
}

export type LanguageLearningDashboardPageController = ReturnType<typeof useLanguageLearningDashboardPageController>;
