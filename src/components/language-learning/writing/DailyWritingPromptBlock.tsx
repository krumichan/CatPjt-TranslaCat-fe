"use client";

import { useTranslations } from "next-intl";

import type { DailyWritingType } from "@/types/language-learning/common";
import type { DailyWritingItem } from "@/types/language-learning/daily";

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
                    <GuideSection
                        title={t("guidance.providedFacts")}
                        items={item.providedFacts}
                    />
                    <GuideSection
                        title={t("guidance.requiredIntents")}
                        items={item.requiredIntents}
                    />
                    <GuideSection
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

function GuideSection({
    title,
    items,
}: {
    title: string;
    items: string[];
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white/75 p-4 dark:border-white/10 dark:bg-black/10">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200">
                {title}
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {items.map((value, index) => (
                    <li key={`${title}-${index}-${value}`} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{value}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
