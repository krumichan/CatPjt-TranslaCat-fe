"use client";

import { useTranslations } from "next-intl";

import { CHAT_LANGUAGE_OPTIONS } from "@/constants/chatLanguages";
import { useChatLanguageSettingsForm } from "@/hooks/chat/useChatLanguageSettingsForm";

import type {
    ChatDefaultLanguageSettings,
    ChatLanguageSettings,
    ChatLanguageSettingsSource,
    ChatLanguageSettingsUpdateRequest,
} from "@/types/chat";

interface ChatLanguageSettingsFormProps {
    settings: ChatLanguageSettings;
    defaultSettings: ChatDefaultLanguageSettings | null;
    resolvedSource: ChatLanguageSettingsSource | null;
    isSaving: boolean;
    saveErrorMessage: string | null;
    onClose: () => void;
    onSave: (request: ChatLanguageSettingsUpdateRequest) => Promise<boolean>;
}

export function ChatLanguageSettingsForm({
    settings,
    defaultSettings,
    resolvedSource,
    isSaving,
    saveErrorMessage,
    onClose,
    onSave,
}: ChatLanguageSettingsFormProps) {
    const t = useTranslations("ChatRoom.languageSettings");
    const {
        form,
        setOriginalLanguageCode,
        setTranslationLanguageCode,
        setShowOriginal,
        setShowTranslation,
        handleSubmit,
    } = useChatLanguageSettingsForm({
        settings,
        onSave,
        onClose,
    });

    const sourceLabel = resolvedSource
        ? t(`source.${resolvedSource}`)
        : t("source.UNKNOWN");

    return (
        <>
            <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-relaxed text-orange-900 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-100">
                    <p className="font-black">{t("scopeTitle")}</p>
                    <p className="mt-1">{t("scopeDescription")}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-200">
                        {sourceLabel}
                    </p>
                </div>

                {defaultSettings && resolvedSource !== "ROOM_OVERRIDE" && (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-400">
                        {t("defaultApplied")}
                    </p>
                )}

                <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("originalLanguage")}
                    </span>
                    <select
                        value={form.originalLanguageCode}
                        onChange={(event) =>
                            setOriginalLanguageCode(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                        {CHAT_LANGUAGE_OPTIONS.map((language) => (
                            <option key={language.code} value={language.code}>
                                {language.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("translationLanguage")}
                    </span>
                    <select
                        value={form.translationLanguageCode}
                        onChange={(event) =>
                            setTranslationLanguageCode(event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                        {CHAT_LANGUAGE_OPTIONS.map((language) => (
                            <option key={language.code} value={language.code}>
                                {language.label}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                    <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={form.showOriginal}
                            onChange={(event) =>
                                setShowOriginal(event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        {t("showOriginal")}
                    </label>

                    <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={form.showTranslation}
                            onChange={(event) =>
                                setShowTranslation(event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        {t("showTranslation")}
                    </label>
                </div>

                {saveErrorMessage && (
                    <p className="text-sm text-red-500 dark:text-red-300">
                        {saveErrorMessage}
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    {t("cancel")}
                </button>
                <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isSaving}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? t("saving") : t("save")}
                </button>
            </div>
        </>
    );
}
