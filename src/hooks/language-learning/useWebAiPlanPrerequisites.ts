"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import {
    hasWebAiEffectiveKeywords,
    hasWebAiLanguageSettings,
    LANGUAGE_LEARNING_SETUP_UPDATED,
    type WebAiPrerequisiteStatus,
} from "@/features/language-learning/web-ai/webAiPrerequisites";
import { languageLearningKeywordService } from "@/services/language-learning/languageLearningKeywordService";
import { languageLearningSettingService } from "@/services/language-learning/languageLearningSettingService";
import type { LanguageLearningEffectiveKeywords } from "@/types/language-learning/keyword";
import type { LanguageLearningUserSetting } from "@/types/language-learning/setting";

interface SetupState {
    account: string | null;
    settingsStatus: WebAiPrerequisiteStatus;
    keywordsStatus: WebAiPrerequisiteStatus;
    setting: LanguageLearningUserSetting | null;
    keywords: LanguageLearningEffectiveKeywords | null;
}

function loadingState(account: string | null): SetupState {
    return { account, settingsStatus: "loading", keywordsStatus: "loading", setting: null, keywords: null };
}

export function useWebAiPlanPrerequisites() {
    const { data: session } = useSession();
    const account = session?.user?.publicId
        ? `${session.user.publicId}:${session.loginSessionId ?? ""}`
        : null;
    const [state, setState] = useState<SetupState>(() => loadingState(null));
    const [revision, setRevision] = useState(0);
    const requestRevision = useRef(0);

    const refresh = useCallback(() => {
        // 재검사 중에는 이전 계정·이전 설정의 완료 상태로 새 계획을 만들지 않는다.
        requestRevision.current += 1;
        setState(loadingState(account));
        setRevision((value) => value + 1);
    }, [account]);

    useEffect(() => {
        if (!account) return;
        let cancelled = false;
        const request = ++requestRevision.current;

        // 두 조회의 실패를 각각 구분해, 장애를 미설정으로 잘못 안내하지 않는다.
        void Promise.allSettled([
            languageLearningSettingService.get(),
            languageLearningKeywordService.getEffective(),
        ]).then(([settingsResult, keywordsResult]) => {
            if (cancelled || request !== requestRevision.current) return;
            const setting = settingsResult.status === "fulfilled" ? settingsResult.value : null;
            const keywords = keywordsResult.status === "fulfilled" ? keywordsResult.value : null;
            setState({
                account,
                setting,
                keywords,
                settingsStatus: settingsResult.status === "rejected" ? "error" : hasWebAiLanguageSettings(setting) ? "complete" : "missing",
                keywordsStatus: keywordsResult.status === "rejected" ? "error" : hasWebAiEffectiveKeywords(keywords) ? "complete" : "missing",
            });
        });
        return () => { cancelled = true; };
    }, [account, revision]);

    useEffect(() => {
        if (!account) return;
        window.addEventListener("focus", refresh);
        window.addEventListener(LANGUAGE_LEARNING_SETUP_UPDATED, refresh);
        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener(LANGUAGE_LEARNING_SETUP_UPDATED, refresh);
        };
    }, [account, refresh]);

    const current = state.account === account && account ? state : loadingState(account);
    return {
        ...current,
        ready: current.settingsStatus === "complete" && current.keywordsStatus === "complete",
        refresh,
    };
}

export type WebAiPlanPrerequisites = ReturnType<typeof useWebAiPlanPrerequisites>;
