"use client";

import type React from "react";
import { MessageCircle, Shield, UserPlus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

export default function FriendListGuideCard() {
    const t = useTranslations("Social.friendListPage.guide");

    return (
        <aside className="h-fit rounded-4xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80 dark:shadow-none">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                {t("eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t("description")}
            </p>

            <div className="mt-5 space-y-3">
                <GuideItem
                    icon={<UserPlus className="h-5 w-5" />}
                    title={t("items.find.title")}
                    description={t("items.find.description")}
                />
                <GuideItem
                    icon={<MessageCircle className="h-5 w-5" />}
                    title={t("items.direct.title")}
                    description={t("items.direct.description")}
                />
                <GuideItem
                    icon={<UsersRound className="h-5 w-5" />}
                    title={t("items.group.title")}
                    description={t("items.group.description")}
                />
                <GuideItem
                    icon={<Shield className="h-5 w-5" />}
                    title={t("items.manage.title")}
                    description={t("items.manage.description")}
                />
            </div>
        </aside>
    );
}

type GuideItemProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
};

function GuideItem({ icon, title, description }: GuideItemProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-200">
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        {title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
