"use client";

import { Check, Copy, IdCard, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { UserProfile } from "@/types/social";

interface ProfileInfoCardProps {
    profile: UserProfile;
}

export default function ProfileInfoCard({
    profile,
}: ProfileInfoCardProps) {
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
        <section className="overflow-hidden rounded-4xl border border-slate-200 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="relative aspect-[16/6] overflow-hidden bg-gradient-to-br from-orange-100 via-amber-50 to-slate-100 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-950">
                {profile.profileBackgroundImageUrl && (
                    // 실제 Storage public domain 연결 전까지 next/image remotePatterns를 고정하지 않는다.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={profile.profileBackgroundImageUrl}
                        alt={t("backgroundAlt")}
                        className="h-full w-full object-cover"
                    />
                )}
            </div>

            <div className="relative px-6 pb-6">
                <div className="-mt-12 flex items-end justify-between gap-4">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-orange-400 to-amber-300 text-white shadow-lg dark:border-slate-950">
                        {profile.profileImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profile.profileImageUrl}
                                alt={t("profileAlt")}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <UserRound
                                className="h-10 w-10"
                                aria-hidden="true"
                            />
                        )}
                    </div>

                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                        {t("eyebrow")}
                    </span>
                </div>

                <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
                    {profile.nickname}
                </h2>

                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {profile.bio || t("emptyBio")}
                </p>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        <IdCard
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                        {t("publicId")}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                            {profile.publicId}
                        </code>

                        <button
                            type="button"
                            onClick={() => void handleCopyPublicId()}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                            aria-label={t("copyPublicId")}
                        >
                            {copied ? (
                                <Check
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Copy
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    </div>

                    {copied && (
                        <p className="mt-2 text-xs font-bold text-emerald-500">
                            {t("copied")}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
