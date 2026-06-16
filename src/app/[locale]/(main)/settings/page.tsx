"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

import AccountInfoCard from "@/components/settings/AccountInfoCard";
import SettingsCardGrid from "@/components/settings/SettingsCardGrid";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { settingCards } from "@/components/settings/settingCards";

export default function SettingsPage() {
    const { data: session } = useSession();

    const isAdmin = session?.user?.role === "ADMIN";

    const visibleCards = useMemo(
        () => settingCards.filter((card) => !card.adminOnly || isAdmin),
        [isAdmin],
    );

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-24 pb-10 sm:px-6 lg:px-8">
            <SettingsHeader />

            <AccountInfoCard
                name={session?.user?.name}
                email={session?.user?.email}
                publicId={session?.user?.publicId}
            />

            <SettingsCardGrid cards={visibleCards} />
        </div>
    );
}