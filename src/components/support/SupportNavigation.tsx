"use client";

import { Headphones, Inbox, LockKeyhole, Megaphone, MessagesSquare, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import type { SupportController } from "@/hooks/support/useSupportController";

export function SupportNavigation({ controller }: { controller: SupportController }) {
    const t = useTranslations("Support");
    const { tab, isAdmin, isBusy, navigate } = controller;
    const sections = [
        { key: "inquiries" as const, label: isAdmin ? t("inquiries.adminTitle") : t("inquiries.title"), icon: MessagesSquare },
        { key: "notices" as const, label: t("notices.title"), icon: Megaphone },
        { key: "messages" as const, label: isAdmin ? t("messages.adminTitle") : t("messages.title"), icon: Inbox },
    ];

    return (
        <aside className="border-b border-slate-200 p-4 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:p-6 dark:border-white/10">
            <div className="mb-6 hidden items-center gap-3 md:flex">
                <span className="rounded-2xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300">
                    <Headphones className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{t("title")}</span>
            </div>

            <nav aria-label={t("navigation")} className="grid grid-cols-3 gap-1 md:grid-cols-1 md:gap-2">
                {sections.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        type="button"
                        aria-current={tab === key ? "page" : undefined}
                        disabled={isBusy}
                        onClick={() => navigate(key)}
                        className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold transition md:justify-start md:px-3 md:text-sm ${tab === key
                            ? "bg-violet-50 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200"
                            : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"}`}
                    >
                        <Icon className="hidden h-4 w-4 shrink-0 min-[400px]:block" aria-hidden="true" />
                        {label}
                    </button>
                ))}
            </nav>

            <p className="mt-7 hidden items-start gap-2 px-2 text-xs leading-6 text-slate-500 md:flex dark:text-slate-400">
                {isAdmin
                    ? <ShieldCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                    : <LockKeyhole className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />}
                {t(isAdmin ? "adminGuide" : "privateGuide")}
            </p>
        </aside>
    );
}
