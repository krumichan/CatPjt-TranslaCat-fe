"use client";

import { useTranslations } from "next-intl";

import FriendListWorkspace from "@/components/friends/FriendListWorkspace";
import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";

export default function FriendListPageContent() {
    const t = useTranslations("Social.friendListPage");

    return (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 pt-20 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />

            <FriendListWorkspace />
        </main>
    );
}
