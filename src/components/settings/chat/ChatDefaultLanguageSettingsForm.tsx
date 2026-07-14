import { Save } from "lucide-react";
import { useTranslations } from "next-intl";

import ChatLanguageSelectField from "@/components/settings/chat/ChatLanguageSelectField";
import ChatLanguageVisibilityOptions from "@/components/settings/chat/ChatLanguageVisibilityOptions";
import { useChatDefaultLanguageSettings } from "@/hooks/chat/useChatDefaultLanguageSettings";
import { useChatLanguageSettingsForm } from "@/hooks/chat/useChatLanguageSettingsForm";
import type { ChatDefaultLanguageSettings } from "@/types/chat";

type ChatDefaultLanguageSettingsFormProps = {
    settings: ChatDefaultLanguageSettings;
    isSaving: boolean;
    onSave: ReturnType<typeof useChatDefaultLanguageSettings>["saveSettings"];
};

export default function ChatDefaultLanguageSettingsForm({
    settings,
    isSaving,
    onSave,
}: ChatDefaultLanguageSettingsFormProps) {
    const t = useTranslations("Settings.chatPage.defaultLanguage");
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
    });

    return (
        <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
                <ChatLanguageSelectField
                    label={t("originalLanguage")}
                    value={form.originalLanguageCode}
                    onChange={setOriginalLanguageCode}
                />

                <ChatLanguageSelectField
                    label={t("translationLanguage")}
                    value={form.translationLanguageCode}
                    onChange={setTranslationLanguageCode}
                />
            </div>

            <ChatLanguageVisibilityOptions
                showOriginal={form.showOriginal}
                showTranslation={form.showTranslation}
                showOriginalLabel={t("showOriginal")}
                showTranslationLabel={t("showTranslation")}
                onShowOriginalChange={setShowOriginal}
                onShowTranslationChange={setShowTranslation}
            />

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {isSaving ? t("saving") : t("save")}
                </button>
            </div>
        </div>
    );
}