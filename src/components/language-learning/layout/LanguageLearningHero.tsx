"use client";

import { BookOpenCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface LanguageLearningHeroProps {
    title: string;
    description: string;
    eyebrow?: string;
}

export function LanguageLearningHero({
    title,
    description,
    eyebrow,
}: LanguageLearningHeroProps) {
    const t = useTranslations("LanguageLearning.navigation");

    return (
        <header
            data-testid="language-learning-hero"
            className={cn(
                "flex min-h-46 flex-col justify-center rounded-3xl",
                "border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur",
                "dark:border-white/10 dark:bg-slate-900/75",
                "sm:h-49 sm:min-h-0 sm:p-7",
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-2 text-xs font-black uppercase",
                    "tracking-[0.18em] text-blue-600 dark:text-blue-300",
                )}
            >
                <BookOpenCheck
                    className="h-4 w-4"
                    aria-hidden="true"
                />
                <span>{eyebrow ?? t("eyebrow")}</span>
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
                {title}
            </h1>

            <p
                className={cn(
                    "mt-3 max-w-3xl text-sm leading-6 text-slate-500",
                    "dark:text-slate-400 sm:text-base",
                )}
            >
                {description}
            </p>
        </header>
    );
}
