"use client";

import { Globe2, MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";

export function ChatHubHeader() {
    const t = useTranslations("ChatHub");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                        <MessageCircle
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                        />
                        {t("badge")}
                    </div>

                    <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {t("title")}
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                        href="/chat/open"
                        data-testid="open-chat-explore-link"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-600 transition hover:border-orange-300 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/20 dark:focus-visible:ring-offset-slate-900"
                    >
                        <Globe2 className="h-4 w-4" aria-hidden="true" />
                        {t("openChatExplore.label")}
                    </Link>
                    <Link
                        href="/chat/open/new"
                        data-testid="open-chat-create-link"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-orange-400 dark:text-slate-950 dark:hover:bg-orange-300 dark:focus-visible:ring-offset-slate-900"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t("openChatCreate.label")}
                    </Link>
                </div>
            </div>
        </section>
    );
}
