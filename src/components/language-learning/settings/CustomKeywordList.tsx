"use client";

import { useTranslations } from "next-intl";

import { CustomKeywordItem } from "@/components/language-learning/settings/CustomKeywordItem";
import type { LanguageLearningKeywordManager } from "@/hooks/language-learning/useLanguageLearningKeywordManager";
import type { KeywordType } from "@/types/language-learning/common";
import type { LanguageLearningKeyword } from "@/types/language-learning/keyword";

interface CustomKeywordListProps {
    manager: LanguageLearningKeywordManager;
    editingId: number | null;
    editText: string;
    editType: KeywordType;
    editParentKeywordId: number | null;
    systemTopics: LanguageLearningKeyword[];
    onStartEdit: (keyword: LanguageLearningKeyword) => void;
    onCancelEdit: () => void;
    onEditTextChange: (value: string) => void;
    onEditTypeChange: (value: KeywordType) => void;
    onEditParentKeywordChange: (value: number | null) => void;
    onSave: (keyword: LanguageLearningKeyword) => void;
}

export function CustomKeywordList({
    manager,
    editingId,
    editText,
    editType,
    editParentKeywordId,
    systemTopics,
    onStartEdit,
    onCancelEdit,
    onEditTextChange,
    onEditTypeChange,
    onEditParentKeywordChange,
    onSave,
}: CustomKeywordListProps) {
    const t = useTranslations("LanguageLearning.settings.keywords");
    const keywords = manager.data?.customKeywords ?? [];

    return (
        <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {t("custom.title")}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
                {t("custom.description")}
            </p>

            <div className="mt-3 space-y-2">
                {keywords.length === 0 && (
                    <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-400 dark:bg-white/5">
                        {t("custom.empty")}
                    </p>
                )}

                {keywords.map((keyword) => (
                    <CustomKeywordItem
                        key={keyword.id}
                        keyword={keyword}
                        isEditing={editingId === keyword.id}
                        editText={editText}
                        editType={editType}
                        editParentKeywordId={editParentKeywordId}
                        systemTopics={systemTopics}
                        isBusy={manager.busyKeywordId !== null}
                        onStartEdit={() => onStartEdit(keyword)}
                        onCancelEdit={onCancelEdit}
                        onEditTextChange={onEditTextChange}
                        onEditTypeChange={onEditTypeChange}
                        onEditParentKeywordChange={
                            onEditParentKeywordChange
                        }
                        onSave={() => onSave(keyword)}
                        onDeactivate={() =>
                            void manager.deleteCustom(keyword.id)
                        }
                    />
                ))}
            </div>
        </div>
    );
}
