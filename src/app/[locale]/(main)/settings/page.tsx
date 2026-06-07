"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsCardGrid from "@/components/settings/SettingsCardGrid";
import { settingCards } from "@/components/settings/settingCards";

export default function SettingsPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";

    const visibleCards = useMemo(
        () => settingCards.filter((card) => !card.adminOnly || isAdmin),
        [isAdmin]
    );

    return (
        <main className="mx-auto mt-20 flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
            <SettingsHeader />
            <SettingsCardGrid cards={visibleCards} />
        </main>
    );
}