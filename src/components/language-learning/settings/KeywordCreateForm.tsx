"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import type { KeywordType } from "@/types/language-learning/common";

interface KeywordCreateFormProps {
    text: string;
    type: KeywordType;
    isCreating: boolean;
    errorMessage: string | null;
    onTextChange: (value: string) => void;
    onTypeChange: (value: KeywordType) => void;
    onSubmit: () => void;
}

export function KeywordCreateForm({
    text,
    type,
    isCreating,
    errorMessage,
    onTextChange,
    onTypeChange,
    onSubmit,
}: KeywordCreateFormProps) {
    const t = useTranslations("LanguageLearning.settings.keywords");

    return (
        <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {t("create.title")}
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
                <AppSelect
                    value={type}
                    onChange={(event) =>
                        onTypeChange(event.target.value as KeywordType)
                    }
                    className="px-3 py-2.5"
                >
                    <option value="TOPIC">{t("types.TOPIC")}</option>
                    <option value="VOCABULARY">
                        {t("types.VOCABULARY")}
                    </option>
                </AppSelect>

                <input
                    value={text}
                    onChange={(event) => onTextChange(event.target.value)}
                    maxLength={200}
                    placeholder={t("create.placeholder")}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white"
                />

                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!text.trim() || isCreating}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {isCreating
                        ? t("create.creating")
                        : t("create.action")}
                </button>
            </div>

            {errorMessage && (
                <p
                    role="alert"
                    className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-300"
                >
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
