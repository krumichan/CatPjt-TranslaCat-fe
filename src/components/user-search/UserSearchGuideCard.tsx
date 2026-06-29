"use client";

import type React from "react";
import { IdCard, MessageCircle, ShieldCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

export default function UserSearchGuideCard() {
    const t = useTranslations("Social.userSearchPage.guide");

    return (
        <aside className="rounded-4xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                {t("eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                {t("description")}
            </p>

            <div className="mt-6 space-y-4">
                <GuideItem
                    icon={<IdCard className="h-5 w-5" aria-hidden="true" />}
                    title={t("items.publicId.title")}
                    description={t("items.publicId.description")}
                />
                <GuideItem
                    icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}
                    title={t("items.request.title")}
                    description={t("items.request.description")}
                />
                <GuideItem
                    icon={
                        <MessageCircle
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                    }
                    title={t("items.chat.title")}
                    description={t("items.chat.description")}
                />
                <GuideItem
                    icon={
                        <ShieldCheck
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                    }
                    title={t("items.block.title")}
                    description={t("items.block.description")}
                />
            </div>
        </aside>
    );
}

interface GuideItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function GuideItem({ icon, title, description }: GuideItemProps) {
    return (
        <div className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {description}
                </p>
            </div>
        </div>
    );
}
