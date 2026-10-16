"use client";

import { useLocale } from "next-intl";
import { useCallback, useState } from "react";

import { getLanguageLearningErrorCode } from "@/features/language-learning/common/errorMapping";
import { notifyLanguageLearningSetupUpdated } from "@/features/language-learning/web-ai/webAiPrerequisites";
import { useQuery } from "@/hooks/useQuery";
import { languageLearningKeywordService } from "@/services/language-learning/languageLearningKeywordService";
import type { KeywordType } from "@/types/language-learning/common";
import type { LanguageLearningKeyword } from "@/types/language-learning/keyword";

export function useLanguageLearningKeywordManager() {
    const uiLocale = useLocale();
    const query = useQuery({
        keys: ["language-learning-keywords", uiLocale] as const,
        fetcher: (_key, locale) =>
            languageLearningKeywordService.getAll(locale),
        config: { revalidateOnMount: true },
    });
    const [busyKeywordId, setBusyKeywordId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [actionErrorCode, setActionErrorCode] = useState<string | null>(null);
    const { mutate } = query;

    const refresh = useCallback(async () => {
        // 재조회 중에도 목록을 유지해 화면·펼침 상태·입력 초안을 다시 만들지 않는다.
        await mutate((current) => current, true);
        notifyLanguageLearningSetupUpdated();
    }, [mutate]);

    const createCustom = useCallback(
        async (
            text: string,
            type: KeywordType,
            parentKeywordId: number | null,
        ) => {
            if (isCreating) return false;

            setIsCreating(true);
            setActionErrorCode(null);
            try {
                await languageLearningKeywordService.createCustom({
                    text: text.trim(),
                    type,
                    canonicalKey: null,
                    parentKeywordId:
                        type === "VOCABULARY" ? parentKeywordId : null,
                });
                await refresh();
                return true;
            } catch (error) {
                console.error("Failed to create language learning keyword.", error);
                setActionErrorCode(getLanguageLearningErrorCode(error));
                return false;
            } finally {
                setIsCreating(false);
            }
        },
        [isCreating, refresh],
    );

    const updateCustom = useCallback(
        async (
            keyword: LanguageLearningKeyword,
            values: {
                text: string;
                type: KeywordType;
                parentKeywordId: number | null;
            },
        ) => {
            if (busyKeywordId !== null) return false;

            setBusyKeywordId(keyword.id);
            setActionErrorCode(null);
            try {
                await languageLearningKeywordService.updateCustom(keyword.id, {
                    text: values.text.trim(),
                    type: values.type,
                    canonicalKey: keyword.canonicalKey,
                    active: keyword.active,
                    parentKeywordId:
                        values.type === "VOCABULARY"
                            ? values.parentKeywordId
                            : null,
                });
                await refresh();
                return true;
            } catch (error) {
                console.error("Failed to update language learning keyword.", error);
                setActionErrorCode(getLanguageLearningErrorCode(error));
                return false;
            } finally {
                setBusyKeywordId(null);
            }
        },
        [busyKeywordId, refresh],
    );

    const deleteCustom = useCallback(
        async (keywordId: number) => {
            if (busyKeywordId !== null) return false;

            setBusyKeywordId(keywordId);
            setActionErrorCode(null);
            try {
                await languageLearningKeywordService.deleteCustom(keywordId);
                await refresh();
                return true;
            } catch (error) {
                console.error("Failed to deactivate language learning keyword.", error);
                setActionErrorCode(getLanguageLearningErrorCode(error));
                return false;
            } finally {
                setBusyKeywordId(null);
            }
        },
        [busyKeywordId, refresh],
    );

    const toggleSystem = useCallback(
        async (keyword: LanguageLearningKeyword) => {
            if (busyKeywordId !== null) return false;

            setBusyKeywordId(keyword.id);
            setActionErrorCode(null);
            try {
                const updated = await languageLearningKeywordService.updateSystemSelection(
                    keyword.id,
                    { selected: !keyword.selected },
                );

                // 저장 결과는 먼저 반영하되 응답의 표시명으로 현재 UI 언어를 덮어쓰지 않는다.
                await mutate((current) => current && ({
                    ...current,
                    systemKeywords: current.systemKeywords.map((item) => item.id === updated.id
                        ? { ...item, selected: updated.selected, pendingEffectiveDate: updated.pendingEffectiveDate }
                        : item),
                }), false);
                await refresh();
                return true;
            } catch (error) {
                console.error("Failed to update system keyword selection.", error);
                setActionErrorCode(getLanguageLearningErrorCode(error));
                return false;
            } finally {
                setBusyKeywordId(null);
            }
        },
        [busyKeywordId, mutate, refresh],
    );

    return {
        data: query.data ?? null,
        isLoading: query.isLoading,
        loadError: query.isError,
        busyKeywordId,
        isCreating,
        actionErrorCode,
        createCustom,
        updateCustom,
        deleteCustom,
        toggleSystem,
        refresh,
    };
}

export type LanguageLearningKeywordManager = ReturnType<
    typeof useLanguageLearningKeywordManager
>;
