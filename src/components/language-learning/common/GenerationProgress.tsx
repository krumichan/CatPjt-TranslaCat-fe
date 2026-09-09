"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface GenerationProgressProps {
    readyCount: number;
    readyIndices?: number[];
    targetCount: number;
    generating: boolean;
    failureMessage?: string | null;
    retrying?: boolean;
    waiting?: boolean;
    onRetry?: () => void;
}

/** Generation progress is independent from answer/evaluation progress. */
export function GenerationProgress({ readyCount, readyIndices, targetCount, generating, failureMessage, retrying, waiting, onRetry }: GenerationProgressProps) {
    const t = useTranslations("LanguageLearning.generation");
    if (readyCount >= targetCount && !failureMessage) return null;
    return (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-500/10" data-testid="generation-progress" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="flex items-center gap-2 text-sm font-black text-blue-900 dark:text-blue-100">
                        {generating && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t("progress", { ready: readyCount, total: targetCount })}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {failureMessage ? t("failed") : waiting ? t("waiting") : t("background")}
                    </p>
                </div>
                {failureMessage && onRetry && (
                    <button type="button" onClick={onRetry} disabled={retrying} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                        {retrying ? t("retrying") : t("retry")}
                    </button>
                )}
            </div>
            <ol className="mt-3 flex flex-wrap gap-2" aria-label={t("slots")}>
                {Array.from({ length: Math.max(0, targetCount) }, (_, index) => {
                    const ready = readyIndices ? readyIndices.includes(index + 1) : index < readyCount;
                    return <li key={index} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${ready ? "bg-white text-blue-800 dark:bg-white/10 dark:text-blue-100" : "border border-dashed border-blue-200 text-slate-500 dark:border-blue-400/30 dark:text-slate-400"}`}>
                        {ready && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                        {t(ready ? "slotReady" : "slotWaiting", { number: index + 1 })}
                    </li>;
                })}
            </ol>
        </section>
    );
}
