"use client";

import { ArrowRight, ClipboardCheck, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/navigation";

interface LanguageLearningOnboardingCardProps {
    mode: "SETTING" | "LEVEL_TEST";
}

export function LanguageLearningOnboardingCard({
    mode,
}: LanguageLearningOnboardingCardProps) {
    const t = useTranslations("LanguageLearning.onboarding");
    const isSetting = mode === "SETTING";
    const Icon = isSetting ? Settings2 : ClipboardCheck;
    const href = isSetting
        ? "/language-learning/settings"
        : "/language-learning/level-test";

    return (
        <section className="overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 shadow-sm dark:border-blue-500/20 dark:from-blue-950/40 dark:via-slate-900 dark:to-cyan-950/30 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-xl font-black text-slate-950 dark:text-white">
                            {t(`${mode}.title`)}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {t(`${mode}.description`)}
                        </p>
                    </div>
                </div>

                <Link
                    href={href}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    {t(`${mode}.action`)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
