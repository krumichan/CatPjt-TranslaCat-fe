"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function ChatHubHeader() {
    const t = useTranslations("ChatHub");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
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
        </section>
    );
}
