"use client";

import { KeyRound, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { getKeywordPrimaryText } from "@/features/language-learning/keyword/keywordDisplay";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";
import type { SpeakingStartPageController } from "@/hooks/language-learning/speaking/useSpeakingStartPageController";

export function SpeakingTopicSelector({
    controller,
}: {
    controller: SpeakingStartPageController;
}) {
    const t = useTranslations("LanguageLearning.speaking.start.topic");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
            <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t("description")}
                </p>
            </div>

            <div
                className="mt-6 grid gap-3 md:grid-cols-2"
                role="group"
                aria-label={t("selectionType")}
            >
                <button
                    type="button"
                    onClick={controller.selectKeywordTopics}
                    aria-pressed={!controller.useCustomTopic}
                    data-testid="speaking-topic-mode-keywords"
                    className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        !controller.useCustomTopic
                            ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-500/10"
                            : "border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-white/10 dark:bg-white/5",
                    )}
                >
                    <span className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300">
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span>
                            <span className="block text-sm font-black text-slate-900 dark:text-white">
                                {t("keywordTitle")}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {t("keywordDescription")}
                            </span>
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    onClick={controller.selectCustomTopic}
                    aria-pressed={controller.useCustomTopic}
                    data-testid="speaking-topic-mode-custom"
                    className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                        controller.useCustomTopic
                            ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-500/10"
                            : "border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-white/10 dark:bg-white/5",
                    )}
                >
                    <span className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300">
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span>
                            <span className="block text-sm font-black text-slate-900 dark:text-white">
                                {t("customTitle")}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {t("customDescription")}
                            </span>
                        </span>
                    </span>
                </button>
            </div>

            {!controller.useCustomTopic ? (
                <div
                    className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-400/20 dark:bg-blue-500/5"
                    data-testid="speaking-keyword-topic-panel"
                >
                    {controller.keywordsLoading ? (
                        <p className="text-sm text-slate-400">{t("keywordLoading")}</p>
                    ) : controller.keywordsError ? (
                        <p className="text-sm font-bold text-rose-500">
                            {t("keywordLoadFailed")}
                        </p>
                    ) : controller.selectedKeywords.length === 0 ? (
                        <div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                {t("keywordEmpty")}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {t("keywordEmptyHelp")}
                            </p>
                            <Link
                                href="/language-learning/settings"
                                className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-500"
                            >
                                {t("openSettings")}
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                {t("keywordPreviewTitle")}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {controller.selectedKeywords.map((keyword) => (
                                    <span
                                        key={`${keyword.source}:${keyword.id}`}
                                        className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200"
                                    >
                                        {getKeywordPrimaryText(keyword)}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {t("keywordHelp")}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    className="mt-6 rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-5 dark:border-blue-400/30 dark:bg-blue-500/5"
                    data-testid="speaking-custom-topic-panel"
                >
                    <label className="block">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {t("customLabel")}
                        </span>
                        <textarea
                            value={controller.customTopic}
                            onChange={(event) => controller.setCustomTopic(event.target.value)}
                            maxLength={300}
                            rows={3}
                            placeholder={t("customPlaceholder")}
                            data-testid="speaking-custom-topic-input"
                            className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                        />
                        <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {t("customHelp")}
                        </span>
                    </label>
                </div>
            )}
        </section>
    );
}
