"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { DailyWritingSmartPage } from "@/components/language-learning/writing/DailyWritingSmartPage";
import { CuratedWritingSmartPage } from "@/components/language-learning/writing/CuratedWritingSmartPage";
import { useQuery } from "@/hooks/useQuery";
import { languageLearningSettingService } from "@/services/language-learning/languageLearningSettingService";

export function LanguageLearningWritingPage() {
    return process.env.NEXT_PUBLIC_WRITING_CURATED_QA === "true"
        ? <ConfiguredWritingPage />
        : <DailyWritingSmartPage />;
}

function ConfiguredWritingPage() {
    const t = useTranslations("LanguageLearning.writing");
    const common = useTranslations("LanguageLearning.common");
    const { data: session, status } = useSession();
    const owner = session?.user?.publicId;
    const loginSessionId = session?.loginSessionId;
    const authenticated = status === "authenticated" && !!owner && !!loginSessionId;

    // 언어 변경 직후 재진입도 서버에서 확인하도록 이 조회만 중복제거 대기를 끈다.
    const settingQuery = useQuery({
        keys: authenticated ? ["writing-mode-setting", owner, loginSessionId] as const : null,
        fetcher: () => languageLearningSettingService.get(),
        config: { revalidateOnMount: true, dedupingInterval: 0 },
    });

    // 계정별 현재 설정의 재조회를 기다린다. 지난 캐시로 검수 화면을 먼저 열지 않는다.
    const failed = status === "unauthenticated" || !!settingQuery.isError;
    if (!authenticated || settingQuery.isLoading || settingQuery.isValidating || failed) {
        return (
            <LanguageLearningPageLayout guideTopic="language-learning/writing" title={t("title")} description={t("description")}>
                <LanguageLearningStateCard
                    variant={failed ? "error" : "loading"}
                    title={common(failed ? "loadFailedTitle" : "loadingTitle")}
                    message={t(failed ? "loadFailed" : "loadingEntry")}
                    actionLabel={failed ? common("retry") : undefined}
                    onAction={failed ? () => void settingQuery.mutate(undefined, true) : undefined}
                />
            </LanguageLearningPageLayout>
        );
    }

    const setting = settingQuery.data;

    // 검수 문제는 한국어→일본어 전용이며, 다른 쌍은 범용 작문을 사용한다.
    return setting?.configured && setting.originLanguage === "ko" && setting.learningLanguage === "ja"
        ? <CuratedWritingSmartPage />
        : <DailyWritingSmartPage />;
}
