"use client";

import { useTranslations } from "next-intl";
import type { SupportInquiryStatus } from "@/types/support";

export function SupportStatusBadge({ status }: { status: SupportInquiryStatus }) {
    const t = useTranslations("Support");
    const colors = status === "CLOSED"
        ? "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
        : status === "ANSWERED"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
            : "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300";

    return <span className={`inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${colors}`}>{t(`status.${status}`)}</span>;
}
