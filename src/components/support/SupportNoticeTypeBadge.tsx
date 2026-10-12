"use client";

import { useTranslations } from "next-intl";

import type { SupportNoticeType } from "@/types/support";

export function SupportNoticeTypeBadge({ noticeType }: { noticeType: SupportNoticeType }) {
    const t = useTranslations("Support");
    const colors = noticeType === "URGENT"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
        : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300";

    return (
        <span className={`inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${colors}`}>
            {t(`notices.type.${noticeType}`)}
        </span>
    );
}
