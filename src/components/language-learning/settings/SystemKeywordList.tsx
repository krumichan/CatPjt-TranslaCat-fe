"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

import type { LanguageLearningKeywordManager } from "@/hooks/language-learning/useLanguageLearningKeywordManager";

interface SystemKeywordListProps {
    manager: LanguageLearningKeywordManager;
}

export function SystemKeywordList({ manager }: SystemKeywordListProps) {
    const t = useTranslations("LanguageLearning.settings.keywords");

    return (
        <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {t("system.title")}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
                {t("system.description")}
            </p>

            <div className="mt-3 space-y-2">
                {(manager.data?.systemKeywords ?? []).map((keyword) => (
                    <button
                        key={keyword.id}
                        type="button"
                        disabled={
                            manager.busyKeywordId !== null || !keyword.active
                        }
                        onClick={() => void manager.toggleSystem(keyword)}
                        className={clsx(
                            "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition",
                            keyword.selected
                                ? "border-blue-300 bg-blue-50 dark:border-blue-400/30 dark:bg-blue-500/10"
                                : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5",
                        )}
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
                                {keyword.text}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                {t(`types.${keyword.type}`)} · {keyword.canonicalKey}
                            </p>
                        </div>

                        <span
                            className={clsx(
                                "shrink-0 rounded-full px-2 py-1 text-xs font-black",
                                keyword.selected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300",
                            )}
                        >
                            {keyword.selected
                                ? t("selected")
                                : t("notSelected")}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
