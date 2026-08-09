"use client";

import { Bot, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ChatAiDisclosureType } from "@/types/chat";

interface ChatAiDisclosureBadgeProps {
    aiEnabled: boolean;
    disclosureType: ChatAiDisclosureType | null;
    aiMemberCount?: number;
    compact?: boolean;
}

export function ChatAiDisclosureBadge({
    aiEnabled,
    disclosureType,
    aiMemberCount,
    compact = false,
}: ChatAiDisclosureBadgeProps) {
    const t = useTranslations("ChatAi");

    if (!aiEnabled) {
        return null;
    }

    const isPrivate = disclosureType === "PRIVATE";
    const Icon = isPrivate ? EyeOff : Eye;

    return (
        <span
            data-testid={`chat-ai-disclosure-${isPrivate ? "private" : "public"}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${
                isPrivate
                    ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200"
                    : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-200"
            }`}
        >
            {compact ? (
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t(`disclosure.${isPrivate ? "PRIVATE" : "PUBLIC"}.label`)}
            {typeof aiMemberCount === "number" && (
                <span aria-label={t("memberCount", { count: aiMemberCount })}>
                    · {aiMemberCount}
                </span>
            )}
        </span>
    );
}
