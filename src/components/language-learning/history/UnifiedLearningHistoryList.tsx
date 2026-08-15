"use client";

import { MessageCircleMore, PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { LearningHistoryPageController } from "@/hooks/language-learning/useLearningHistoryPageController";

export function UnifiedLearningHistoryList({
    controller,
}: {
    controller: LearningHistoryPageController;
}) {
    const t = useTranslations("LanguageLearning.history.unified");

    return (
        <aside className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                {(["ALL", "WRITING", "SPEAKING"] as const).map((source) => (
                    <button
                        key={source}
                        type="button"
                        onClick={() => controller.setSource(source)}
                        className={cn(
                            "rounded-lg px-2 py-2 text-xs font-black transition",
                            controller.source === source
                                ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200"
                                : "text-slate-500 dark:text-slate-400",
                        )}
                    >
                        {t(`source.${source}`)}
                    </button>
                ))}
            </div>

            <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto">
                {controller.items.map((item) => {
                    const selected = controller.selectedActivityId === item.activityId;
                    const Icon = item.source === "SPEAKING" ? MessageCircleMore : PencilLine;
                    return (
                        <button
                            key={item.activityId}
                            type="button"
                            onClick={() => controller.selectActivity(item.activityId)}
                            className={cn(
                                "w-full rounded-xl px-3 py-3 text-left transition",
                                selected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="text-xs font-black">{t(`source.${item.source}`)}</span>
                            </div>
                            <p className="mt-1 truncate text-sm font-black">{item.title}</p>
                            <p className={cn("mt-1 text-xs", selected ? "text-blue-100" : "text-slate-400")}>
                                {item.learningDate} · {item.overallScore === null ? "—" : Math.round(item.overallScore)}
                            </p>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
