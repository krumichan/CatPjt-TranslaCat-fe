"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import type { KeywordType } from "@/types/language-learning/common";
import type { LanguageLearningKeyword } from "@/types/language-learning/keyword";

interface CustomKeywordItemProps {
    keyword: LanguageLearningKeyword;
    isEditing: boolean;
    editText: string;
    editType: KeywordType;
    isBusy: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onEditTextChange: (value: string) => void;
    onEditTypeChange: (value: KeywordType) => void;
    onSave: () => void;
    onDeactivate: () => void;
}

export function CustomKeywordItem({
    keyword,
    isEditing,
    editText,
    editType,
    isBusy,
    onStartEdit,
    onCancelEdit,
    onEditTextChange,
    onEditTypeChange,
    onSave,
    onDeactivate,
}: CustomKeywordItemProps) {
    const t = useTranslations("LanguageLearning.settings.keywords");

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            {isEditing ? (
                <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
                        <AppSelect
                            value={editType}
                            onChange={(event) =>
                                onEditTypeChange(
                                    event.target.value as KeywordType,
                                )
                            }
                            className="rounded-lg px-3 py-2"
                        >
                            <option value="TOPIC">{t("types.TOPIC")}</option>
                            <option value="VOCABULARY">
                                {t("types.VOCABULARY")}
                            </option>
                        </AppSelect>

                        <input
                            value={editText}
                            onChange={(event) =>
                                onEditTextChange(event.target.value)
                            }
                            maxLength={200}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/20 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className="rounded-lg px-3 py-2 text-xs font-black text-slate-500"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={!editText.trim() || isBusy}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                            {t("save")}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p
                                className={clsx(
                                    "truncate text-sm font-black",
                                    keyword.active
                                        ? "text-slate-800 dark:text-slate-100"
                                        : "text-slate-400 line-through",
                                )}
                            >
                                {keyword.text}
                            </p>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                                {t(`types.${keyword.type}`)}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                            {keyword.canonicalKey}
                            {keyword.pendingEffectiveDate
                                ? ` · ${t("pending", {
                                      date: keyword.pendingEffectiveDate,
                                  })}`
                                : ""}
                        </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <button
                            type="button"
                            onClick={onStartEdit}
                            disabled={isBusy}
                            className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200"
                        >
                            {t("edit")}
                        </button>
                        {keyword.active && (
                            <button
                                type="button"
                                onClick={onDeactivate}
                                disabled={isBusy}
                                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 dark:bg-rose-500/10 dark:text-rose-200"
                            >
                                {t("deactivate")}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
