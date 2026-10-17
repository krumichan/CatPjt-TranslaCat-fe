"use client";

import { CircleHelp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { getGuideHelpTarget, type GuideHelpTopic } from "@/lib/docs/guideHelp";
import { cn } from "@/lib/utils";

export type { GuideHelpTopic } from "@/lib/docs/guideHelp";
export type GuideTopic = GuideHelpTopic;

type GuideHelpLinkProps = {
    topic: GuideHelpTopic;
    variant?: "icon" | "text";
    className?: string;
};

export function GuideHelpLink({
    topic,
    variant = "icon",
    className,
}: GuideHelpLinkProps) {
    const locale = useLocale();
    const t = useTranslations("Common.guideHelp");
    const target = getGuideHelpTarget(topic, locale);
    const accessibleLabel = t("open", { topic: target.title });

    // 새 탭의 일반 링크로 열어 작성 중인 폼과 현재 서비스 화면을 유지한다.
    return (
        <a
            href={target.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={accessibleLabel}
            title={accessibleLabel}
            data-guide-topic={topic}
            className={cn(
                "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-500 transition",
                "hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500",
                "dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300",
                variant === "icon" ? "w-11" : "px-3",
                className,
            )}
        >
            <CircleHelp className="h-[18px] w-[18px]" aria-hidden="true" />
            {variant === "text" && <span>{t("label")}</span>}
        </a>
    );
}
