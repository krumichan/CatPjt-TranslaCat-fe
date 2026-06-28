"use client";

import { Check, Copy, IdCard, Image as ImageIcon, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { UserProfile } from "@/types/social";

interface ProfileInfoCardProps {
    profile: UserProfile;
}

export default function ProfileInfoCard({ profile }: ProfileInfoCardProps) {
    const t = useTranslations("Social.profilePage.info");
    const [copied, setCopied] = useState(false);

    const handleCopyPublicId = async () => {
        if (!profile.publicId) {
            return;
        }

        try {
            await navigator.clipboard.writeText(profile.publicId);
            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 1500);
        } catch (error) {
            console.error("Failed to copy publicId.", error);
        }
    };

    return (
        <section className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex flex-col items-center text-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-orange-200 bg-orange-50 text-orange-500 shadow-inner dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200">
                    {profile.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={profile.profileImageUrl}
                            alt={profile.nickname}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <UserRound className="h-12 w-12" aria-hidden="true" />
                    )}
                </div>

                <p className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                    {t("eyebrow")}
                </p>

                <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    {profile.nickname}
                </h2>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {profile.bio || t("emptyBio")}
                </p>
            </div>

            <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        <IdCard className="h-4 w-4" aria-hidden="true" />
                        {t("publicId")}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10">
                            {profile.publicId}
                        </code>

                        <button
                            type="button"
                            onClick={handleCopyPublicId}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                            aria-label={t("copyPublicId")}
                        >
                            {copied ? (
                                <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Copy className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>

                    {copied && (
                        <p className="mt-2 text-xs font-bold text-emerald-500">
                            {t("copied")}
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        <ImageIcon className="h-4 w-4" aria-hidden="true" />
                        {t("profileImageUrl")}
                    </div>
                    <p className="mt-3 break-all text-sm text-slate-600 dark:text-slate-300">
                        {profile.profileImageUrl || t("emptyProfileImageUrl")}
                    </p>
                </div>
            </div>
        </section>
    );
}
