"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import { ChatAiSystemSettingsSmartForm } from "@/components/settings/admin/chat-ai/ChatAiSystemSettingsSmartForm";

export default function AdminChatAiSettingsPage() {
    const t = useTranslations("Settings.chatAiPage");
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="mx-auto w-full max-w-6xl px-4 pt-24 pb-10 text-sm text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
                {t("messages.loading")}
            </div>
        );
    }

    if (session?.user?.role !== "ADMIN") {
        return (
            <div className="mx-auto w-full max-w-6xl px-4 pt-24 pb-10 text-sm text-red-500 dark:text-red-300 sm:px-6 lg:px-8">
                {t("messages.forbidden")}
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-24 pb-10 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />
            <ChatAiSystemSettingsSmartForm />
        </div>
    );
}
