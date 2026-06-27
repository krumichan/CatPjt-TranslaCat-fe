"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChatLanguageSettingsForm } from "@/components/chat/room/modal/ChatLanguageSettingsForm";
import type {
    ChatLanguageSettings,
    ChatLanguageSettingsUpdateRequest,
} from "@/types/chat";

interface ChatLanguageSettingsModalProps {
    open: boolean;
    settings: ChatLanguageSettings | null;
    isLoading: boolean;
    isSaving: boolean;
    loadErrorMessage: string | null;
    saveErrorMessage: string | null;
    onClose: () => void;
    onSave: (request: ChatLanguageSettingsUpdateRequest) => Promise<boolean>;
    onReload: () => Promise<void>;
}

export function ChatLanguageSettingsModal({
    open,
    settings,
    isLoading,
    isSaving,
    loadErrorMessage,
    saveErrorMessage,
    onClose,
    onSave,
    onReload,
}: ChatLanguageSettingsModalProps) {
    const t = useTranslations("ChatRoom.languageSettings");

    if (!open) {
        return null;
    }

    const settingsKey = settings
        ? [
            settings.originalLanguageCode,
            settings.translationLanguageCode,
            String(settings.showOriginal),
            String(settings.showTranslation),
        ].join(":")
        : "empty";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
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
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label={t("close")}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-5">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t("loading")}
                        </p>
                    </div>
                ) : loadErrorMessage ? (
                    <div className="p-5">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            <p>{loadErrorMessage}</p>

                            <button
                                type="button"
                                onClick={() => void onReload()}
                                className="mt-3 text-sm font-semibold underline"
                            >
                                {t("retry")}
                            </button>
                        </div>
                    </div>
                ) : settings ? (
                    <ChatLanguageSettingsForm
                        key={settingsKey}
                        settings={settings}
                        isSaving={isSaving}
                        saveErrorMessage={saveErrorMessage}
                        onClose={onClose}
                        onSave={onSave}
                    />
                ) : (
                    <div className="p-5">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t("loadFailed")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}