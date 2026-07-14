"use client";

import { X } from "lucide-react";

import { useTranslations } from "next-intl";

import { ChatLanguageSettingsForm } from "@/components/chat/room/modal/ChatLanguageSettingsForm";

import type {
    ChatDefaultLanguageSettings,
    ChatLanguageSettings,
    ChatLanguageSettingsSource,
    ChatLanguageSettingsUpdateRequest,
} from "@/types/chat";

interface ChatLanguageSettingsModalProps {
    isOpen: boolean;
    settings: ChatLanguageSettings | null;
    defaultSettings: ChatDefaultLanguageSettings | null;
    resolvedSource: ChatLanguageSettingsSource | null;
    isLoading: boolean;
    isSaving: boolean;
    loadErrorCode: string | null;
    saveErrorCode: string | null;
    onClose: () => void;
    onSave: (request: ChatLanguageSettingsUpdateRequest) => Promise<boolean>;
    onReload: () => Promise<void>;
}

export function ChatLanguageSettingsModal({
    isOpen,
    settings,
    defaultSettings,
    resolvedSource,
    isLoading,
    isSaving,
    loadErrorCode,
    saveErrorCode,
    onClose,
    onSave,
    onReload,
}: ChatLanguageSettingsModalProps) {
    const t = useTranslations("ChatRoom.languageSettings");

    if (!isOpen) {
        return null;
    }

    const loadErrorMessage = loadErrorCode ? t("loadFailed") : null;
    const saveErrorMessage = saveErrorCode ? t("saveFailed") : null;
    const settingsKey = settings
        ? [
              settings.originalLanguageCode,
              settings.translationLanguageCode,
              String(settings.showOriginal),
              String(settings.showTranslation),
              resolvedSource ?? "UNKNOWN",
          ].join(":")
        : "empty";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {t("title")}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label={t("close")}
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="custom-scroll max-h-[calc(100vh-10rem)] overflow-y-auto">
                    {isLoading && (
                        <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
                            {t("loading")}
                        </div>
                    )}

                    {!isLoading && loadErrorMessage && (
                        <div className="space-y-4 p-5">
                            <p className="text-sm text-red-500 dark:text-red-300">
                                {loadErrorMessage}
                            </p>
                            <button
                                type="button"
                                onClick={() => void onReload()}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                {t("retry")}
                            </button>
                        </div>
                    )}

                    {!isLoading && !loadErrorMessage && settings && (
                        <ChatLanguageSettingsForm
                            key={settingsKey}
                            settings={settings}
                            defaultSettings={defaultSettings}
                            resolvedSource={resolvedSource}
                            isSaving={isSaving}
                            saveErrorMessage={saveErrorMessage}
                            onClose={onClose}
                            onSave={onSave}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
