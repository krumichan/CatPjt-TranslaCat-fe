"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import { getLanguageLearningErrorCode } from "@/hooks/language-learning/languageLearningErrorMapper";
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

    const refresh = useCallback(async () => {
        await query.mutate(undefined, true);
    }, [query]);

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
                await languageLearningKeywordService.updateSystemSelection(
                    keyword.id,
                    { selected: !keyword.selected },
                );
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
        [busyKeywordId, refresh],
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
