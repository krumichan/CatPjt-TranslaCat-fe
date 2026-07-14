"use client";

import { useTranslations } from "next-intl";

import ChatDefaultLanguageSettingsSection from "@/components/settings/chat/ChatDefaultLanguageSettingsSection";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";

export default function ChatSettingsPage() {
    const t = useTranslations("Settings.chatPage");

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-24 pb-10 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />
            <ChatDefaultLanguageSettingsSection />
        </div>
    );
}
