"use client";

import { Check, Circle, LoaderCircle, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import type { WebAiPlanPrerequisites } from "@/hooks/language-learning/useWebAiPlanPrerequisites";
import { Link } from "@/navigation";

const STATUS_ICONS = { complete: Check, loading: LoaderCircle, error: TriangleAlert, missing: Circle };
const STATUS_COLORS = {
    complete: "text-emerald-600 dark:text-emerald-300",
    loading: "animate-spin text-blue-600 dark:text-blue-300",
    error: "text-amber-600 dark:text-amber-300",
    missing: "text-slate-400",
};

export function WebAiPlanPrerequisiteChecklist({
    prerequisites,
    localLinks = false,
}: {
    prerequisites: WebAiPlanPrerequisites;
    localLinks?: boolean;
}) {
    const t = useTranslations("LanguageLearning.settings.webAiSetup");
    const steps = [
        { key: "settings", status: prerequisites.settingsStatus, anchor: "learning-settings" },
        { key: "keywords", status: prerequisites.keywordsStatus, anchor: "learning-keywords" },
    ] as const;
    const hasError = steps.some((step) => step.status === "error");
    const loading = steps.some((step) => step.status === "loading");

    return (
        <div data-testid="web-ai-plan-prerequisites" className="space-y-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
                {t(prerequisites.ready ? "ready" : loading ? "checking" : hasError ? "unavailable" : "title")}
            </p>
            <ol className="grid gap-2 sm:grid-cols-2">
                {steps.map((step) => {
                    const Icon = STATUS_ICONS[step.status];
                    return (
                        <li key={step.key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-xs dark:border-white/10 dark:bg-slate-900/40">
                            <Icon className={`h-4 w-4 ${STATUS_COLORS[step.status]}`} aria-hidden="true" />
                            <span className="flex-1 font-bold text-slate-700 dark:text-slate-200">{t(`${step.key}Label`)}</span>
                            {step.status === "missing" ? localLinks ? (
                                <a href={`#${step.anchor}`} className="shrink-0 font-black text-blue-700 underline dark:text-blue-300">{t(`${step.key}Action`)}</a>
                            ) : (
                                <Link href={`/language-learning/settings#${step.anchor}`} className="shrink-0 font-black text-blue-700 underline dark:text-blue-300">{t(`${step.key}Action`)}</Link>
                            ) : <span className="shrink-0 text-slate-500 dark:text-slate-400">{t(`status.${step.status}`)}</span>}
                        </li>
                    );
                })}
            </ol>
            {!prerequisites.ready && !loading && !hasError && (
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{t(prerequisites.keywordsStatus === "missing" ? "keywordsHelp" : "help")}</p>
            )}
            {(hasError || prerequisites.keywordsStatus === "missing") && !loading && (
                <button type="button" onClick={prerequisites.refresh} className="min-h-9 text-xs font-black text-blue-700 underline dark:text-blue-300">{t("retry")}</button>
            )}
        </div>
    );
}
