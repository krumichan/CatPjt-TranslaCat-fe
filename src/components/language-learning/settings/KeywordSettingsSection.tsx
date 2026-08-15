"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CustomKeywordList } from "@/components/language-learning/settings/CustomKeywordList";
import { KeywordCreateForm } from "@/components/language-learning/settings/KeywordCreateForm";
import { SystemKeywordList } from "@/components/language-learning/settings/SystemKeywordList";
import type { LanguageLearningKeywordManager } from "@/hooks/language-learning/useLanguageLearningKeywordManager";
import type { KeywordType } from "@/types/language-learning/common";
import type { LanguageLearningKeyword } from "@/types/language-learning/keyword";

interface KeywordSettingsSectionProps {
    manager: LanguageLearningKeywordManager;
}

export function KeywordSettingsSection({
    manager,
}: KeywordSettingsSectionProps) {
    const t = useTranslations("LanguageLearning.settings.keywords");
    const [text, setText] = useState("");
    const [type, setType] = useState<KeywordType>("TOPIC");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [editType, setEditType] = useState<KeywordType>("TOPIC");

    const startEdit = (keyword: LanguageLearningKeyword) => {
        setEditingId(keyword.id);
        setEditText(keyword.text);
        setEditType(keyword.type);
    };

    const submitCreate = async () => {
        if (!text.trim()) return;

        const success = await manager.createCustom(text, type);
        if (success) {
            setText("");
        }
    };

    const submitEdit = async (keyword: LanguageLearningKeyword) => {
        if (!editText.trim()) return;

        const success = await manager.updateCustom(keyword, {
            text: editText,
            type: editType,
        });
        if (success) {
            setEditingId(null);
        }
    };

    const errorMessage =
        manager.actionErrorCode === "LANGUAGE_LEARNING_KEYWORD_DUPLICATED"
            ? t("duplicate")
            : manager.actionErrorCode
              ? t("actionFailed")
              : null;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">
                {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t("description")}
            </p>
            <p className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
                {t("nextDayNotice")}
            </p>

            <KeywordCreateForm
                text={text}
                type={type}
                isCreating={manager.isCreating}
                errorMessage={errorMessage}
                onTextChange={setText}
                onTypeChange={setType}
                onSubmit={() => void submitCreate()}
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <SystemKeywordList manager={manager} />
                <CustomKeywordList
                    manager={manager}
                    editingId={editingId}
                    editText={editText}
                    editType={editType}
                    onStartEdit={startEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onEditTextChange={setEditText}
                    onEditTypeChange={setEditType}
                    onSave={(keyword) => void submitEdit(keyword)}
                />
            </div>
        </section>
    );
}
