"use client";

import { Bot, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ChatAiDisclosureType } from "@/types/chat";

interface ChatAiPolicyNoticeProps {
    disclosureType: ChatAiDisclosureType;
    aiEnabled: boolean;
}

export function ChatAiPolicyNotice({
    disclosureType,
    aiEnabled,
}: ChatAiPolicyNoticeProps) {
    const t = useTranslations("ChatAi");

    if (!aiEnabled) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <div className="flex items-start gap-3">
                    <Bot className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                    <div>
                        <p className="font-black text-slate-700 dark:text-slate-100">
                            {t("disabled.title")}
                        </p>
                        <p className="mt-1 leading-6">{t("disabled.description")}</p>
                    </div>
                </div>
            </div>
        );
    }

    const isPrivate = disclosureType === "PRIVATE";
    const Icon = isPrivate ? EyeOff : Eye;

    return (
        <div
            data-testid="chat-ai-policy-notice"
            className={`rounded-2xl border px-4 py-3 text-sm ${
                isPrivate
                    ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100"
                    : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100"
            }`}
        >
            <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                    <p className="font-black">
                        {t(`disclosure.${disclosureType}.noticeTitle`)}
                    </p>
                    <p className="mt-1 leading-6">
                        {t(`disclosure.${disclosureType}.noticeDescription`)}
                    </p>
                </div>
            </div>
        </div>
    );
}
