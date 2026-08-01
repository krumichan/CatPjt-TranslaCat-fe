"use client";

import { useTranslations } from "next-intl";

import type { OpenChatVisibility } from "@/types/chat";

interface OpenChatCreateSummaryProps {
    name: string;
    visibility: OpenChatVisibility;
    maxMemberCount: string;
}

export function OpenChatCreateSummary({
    name,
    visibility,
    maxMemberCount,
}: OpenChatCreateSummaryProps) {
    const t = useTranslations("OpenChatCreate");

    return (
        <section
            aria-labelledby="open-chat-create-summary-title"
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"
        >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">
                {t("summary.eyebrow")}
            </p>
            <h2
                id="open-chat-create-summary-title"
                className="mt-1 text-lg font-black text-slate-950 dark:text-white"
            >
                {t("summary.title")}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <dt className="text-xs font-black text-slate-400">
                        {t("summary.name")}
                    </dt>
                    <dd className="mt-1 break-words font-black text-slate-800 dark:text-slate-100">
                        {name.trim() || t("summary.empty")}
                    </dd>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <dt className="text-xs font-black text-slate-400">
                            {t("summary.visibility")}
                        </dt>
                        <dd className="mt-1 font-black text-slate-800 dark:text-slate-100">
                            {t(
                                `fields.visibility.options.${visibility}.label`,
                            )}
                        </dd>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <dt className="text-xs font-black text-slate-400">
                            {t("summary.maxMemberCount")}
                        </dt>
                        <dd className="mt-1 font-black text-slate-800 dark:text-slate-100">
                            {maxMemberCount || t("summary.empty")}
                        </dd>
                    </div>
                </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-400">
                {t("summary.notice")}
            </p>
        </section>
    );
}
