"use client";

import { WritingGuideSection } from "@/components/language-learning/writing/WritingGuideSection";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { DailyWritingItem } from "@/types/language-learning/daily";
import { useTranslations } from "next-intl";

interface DailyWritingPromptBlockProps {
    item: DailyWritingItem;
    writingType: DailyWritingType;
    showFocusReason?: boolean;
}

export function DailyWritingPromptBlock({
    item,
    writingType,
    showFocusReason = true,
}: DailyWritingPromptBlockProps) {
    const t = useTranslations("LanguageLearning.writing.item");
    const promptLabel =
        writingType === "TRANSLATION"
            ? t("promptLabel.TRANSLATION")
            : writingType === "GUIDED"
              ? t("promptLabel.GUIDED")
              : t("promptLabel.FREE");

    return (
        <div className="rounded-2xl bg-slate-50 p-5 dark:bg-white/5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                {promptLabel}
            </p>
            <p className="mt-3 text-lg font-bold leading-8 text-slate-900 dark:text-white">
                {item.originText}
            </p>

            {writingType === "GUIDED" && (
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    <WritingGuideSection
                        title={t("guidance.providedFacts")}
                        items={item.providedFacts}
                    />
                    <WritingGuideSection
                        title={t("guidance.requiredIntents")}
                        items={item.requiredIntents}
                    />
                    <WritingGuideSection
                        title={t("guidance.responseConstraints")}
                        items={item.responseConstraints}
                    />
                </div>
            )}

            {showFocusReason && item.focusReason && (
                <p className="mt-3 text-xs leading-5 text-slate-400">
                    {item.focusReason}
                </p>
            )}
        </div>
    );
}
