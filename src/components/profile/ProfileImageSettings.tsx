"use client";

import { useTranslations } from "next-intl";

import ProfileImageSlotCard from "@/components/profile/ProfileImageSlotCard";
import { useProfileImageSlot } from "@/hooks/profile/useProfileImageSlot";
import type { UserProfile } from "@/types/social";

interface ProfileImageSettingsProps {
    profile: UserProfile;
    onProfileChange: (profile: UserProfile) => void;
}

export default function ProfileImageSettings({
    profile,
    onProfileChange,
}: ProfileImageSettingsProps) {
    const t = useTranslations("Social.profilePage.image");

    const profileSlot = useProfileImageSlot({
        kind: "profile",
        onProfileChange,
    });

    const backgroundSlot = useProfileImageSlot({
        kind: "background",
        onProfileChange,
    });

    return (
        <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                    {t("eyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {t("description")}
                </p>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <ProfileImageSlotCard
                    kind="profile"
                    currentUrl={profile.profileImageUrl}
                    slot={profileSlot}
                />
                <ProfileImageSlotCard
                    kind="background"
                    currentUrl={profile.profileBackgroundImageUrl}
                    slot={backgroundSlot}
                />
            </div>
        </section>
    );
}
