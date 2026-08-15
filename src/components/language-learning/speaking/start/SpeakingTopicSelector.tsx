"use client";

import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import { SPEAKING_TOPIC_CATEGORIES } from "@/constants/language-learning/speaking";
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-950 dark:text-white">
                        {t("title")}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>
                <label className="w-full sm:w-52">
                    <span className="sr-only">{t("category")}</span>
                    <AppSelect
                        value={controller.category}
                        onChange={(event) =>
                            controller.setCategory(
                                event.target.value as typeof controller.category,
                            )
                        }
                    >
                        <option value="ALL">{t("all")}</option>
                        {SPEAKING_TOPIC_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                                {t(`categories.${category}`)}
                            </option>
                        ))}
                    </AppSelect>
                </label>
            </div>

            {controller.topicsLoading ? (
                <p className="mt-6 text-sm text-slate-400">{t("loading")}</p>
            ) : controller.topicsError ? (
                <p className="mt-6 text-sm font-bold text-rose-500">
                    {t("loadFailed")}
                </p>
            ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {controller.topics.map((topic) => {
                        const selected =
                            !controller.useCustomTopic &&
                            controller.selectedTopicId === topic.id;
                        return (
                            <button
                                type="button"
                                key={topic.id}
                                onClick={() => controller.selectTopic(topic.id)}
                                aria-pressed={selected}
                                className={cn(
                                    "relative min-h-44 rounded-2xl border p-5 text-left transition",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                                    selected
                                        ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-500/10"
                                        : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400/30",
                                )}
                            >
                                {selected && (
                                    <span className="absolute right-4 top-4 rounded-full bg-blue-600 p-1 text-white">
                                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                    </span>
                                )}
                                <span className="text-xs font-black uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                                    {t(`categories.${topic.category}`)}
                                </span>
                                <h3 className="mt-2 pr-8 text-lg font-black text-slate-900 dark:text-white">
                                    {topic.title}
                                </h3>
                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    {topic.description}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                                    {topic.recommendedLevel && (
                                        <span className="rounded-full bg-white px-2.5 py-1 dark:bg-white/10">
                                            {t("level", { level: topic.recommendedLevel })}
                                        </span>
                                    )}
                                    <span className="rounded-full bg-white px-2.5 py-1 dark:bg-white/10">
                                        {t("minutes", { value: controller.targetMinutes })}
                                    </span>
                                </div>
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={controller.selectCustomTopic}
                        aria-pressed={controller.useCustomTopic}
                        className={cn(
                            "min-h-44 rounded-2xl border border-dashed p-5 text-left transition",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            controller.useCustomTopic
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                                : "border-slate-300 bg-slate-50 hover:border-blue-400 dark:border-white/20 dark:bg-white/5",
                        )}
                    >
                        <Sparkles className="h-5 w-5 text-blue-500" aria-hidden="true" />
                        <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
                            {t("customTitle")}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t("customDescription")}
                        </p>
                    </button>
                </div>
            )}

            {controller.useCustomTopic && (
                <label className="mt-5 block">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {t("customLabel")}
                    </span>
                    <textarea
                        value={controller.customTopic}
                        onChange={(event) => controller.setCustomTopic(event.target.value)}
                        maxLength={300}
                        rows={3}
                        placeholder={t("customPlaceholder")}
                        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                    />
                </label>
            )}
        </section>
    );
}
