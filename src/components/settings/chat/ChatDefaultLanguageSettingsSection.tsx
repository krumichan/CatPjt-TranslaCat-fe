"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";

import ChatDefaultLanguageSettingsForm from "@/components/settings/chat/ChatDefaultLanguageSettingsForm";
import { useChatDefaultLanguageSettings } from "@/hooks/chat/useChatDefaultLanguageSettings";

export default function ChatDefaultLanguageSettingsSection() {
    const t = useTranslations("Settings.chatPage.defaultLanguage");
    const {
        settings,
        resolvedSource,
        isLoading,
        isSaving,
        isSaved,
        loadErrorCode,
        saveErrorCode,
        reload,
        saveSettings,
    } = useChatDefaultLanguageSettings();

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                        {t("eyebrow")}
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                        {t("title")}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void reload()}
                    disabled={isLoading || isSaving}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                >
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    {t("reload")}
                </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                {resolvedSource === "SYSTEM"
                    ? t("systemFallbackNotice")
                    : t("defaultNotice")}
            </div>

            {isLoading && (
                <p className="mt-6 text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t("loading")}
                </p>
            )}

            {!isLoading && loadErrorCode && (
                <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {t("loadFailed")}
                </p>
            )}

            {!isLoading && settings && (
                <div className="mt-6">
                    <ChatDefaultLanguageSettingsForm
                        key={[
                            settings.originalLanguageCode,
                            settings.translationLanguageCode,
                            String(settings.showOriginal),
                            String(settings.showTranslation),
                        ].join(":")}
                        settings={settings}
                        isSaving={isSaving}
                        onSave={saveSettings}
                    />
                </div>
            )}

            {saveErrorCode && (
                <p className="mt-4 text-sm font-bold text-rose-600 dark:text-rose-300">
                    {t("saveFailed")}
                </p>
            )}

            {isSaved && (
                <p className="mt-4 text-sm font-bold text-emerald-600 dark:text-emerald-300">
                    {t("saved")}
                </p>
            )}
        </section>
    );
}