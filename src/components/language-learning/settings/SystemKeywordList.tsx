"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import {
    getKeywordPrimaryText,
    getKeywordSecondaryText,
} from "@/features/language-learning/keyword/keywordDisplay";
import type { LanguageLearningKeywordManager } from "@/hooks/language-learning/useLanguageLearningKeywordManager";
import type { LanguageLearningKeyword } from "@/types/language-learning/keyword";

interface SystemKeywordListProps {
    manager: LanguageLearningKeywordManager;
}

function sortKeywords(keywords: LanguageLearningKeyword[]) {
    return [...keywords].sort(
        (left, right) =>
            (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
            left.id - right.id,
    );
}

export function SystemKeywordList({ manager }: SystemKeywordListProps) {
    const t = useTranslations("LanguageLearning.settings.keywords");
    const [expandedTopicIds, setExpandedTopicIds] = useState<Set<number>>(
        () => new Set(),
    );
    const keywords = sortKeywords(manager.data?.systemKeywords ?? []);
    const topics = keywords.filter(
        (keyword) =>
            keyword.type === "TOPIC" &&
            (keyword.parentKeywordId ?? null) === null,
    );
    const topicIds = new Set(topics.map((topic) => topic.id));
    const ungrouped = keywords.filter(
        (keyword) =>
            !topicIds.has(keyword.id) &&
            (!keyword.parentKeywordId ||
                !topicIds.has(keyword.parentKeywordId)),
    );

    const toggleExpanded = (topicId: number) => {
        setExpandedTopicIds((current) => {
            const next = new Set(current);
            if (next.has(topicId)) next.delete(topicId);
            else next.add(topicId);
            return next;
        });
    };

    const renderKeywordButton = (keyword: LanguageLearningKeyword) => {
        const primaryText = getKeywordPrimaryText(keyword);
        const secondaryText = getKeywordSecondaryText(keyword);

        return (
            <button
                key={keyword.id}
                type="button"
                aria-pressed={keyword.selected}
                disabled={manager.busyKeywordId !== null || !keyword.active}
                onClick={() => void manager.toggleSystem(keyword)}
                data-testid={`system-keyword-${keyword.id}`}
                className={clsx(
                    "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition",
                    keyword.selected
                        ? "border-blue-300 bg-blue-50 dark:border-blue-400/30 dark:bg-blue-500/10"
                        : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5",
                )}
            >
                <div className="min-w-0 flex-1">
                    <p
                        data-testid={`system-keyword-primary-${keyword.id}`}
                        className="whitespace-normal break-words text-sm font-black leading-5 text-slate-800 dark:text-slate-100"
                    >
                        {primaryText}
                    </p>
                    <p
                        data-testid={`system-keyword-meta-${keyword.id}`}
                        className="mt-0.5 whitespace-normal break-all text-[11px] leading-4 text-slate-400"
                    >
                        {secondaryText && `${secondaryText} · `}
                        {t(`types.${keyword.type}`)}
                        {keyword.canonicalKey && ` · ${keyword.canonicalKey}`}
                    </p>
                </div>

                <span
                    className={clsx(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black",
                        keyword.selected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300",
                    )}
                >
                    {keyword.selected ? t("selected") : t("notSelected")}
                </span>
            </button>
        );
    };

    return (
        <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {t("system.title")}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
                {t("system.description")}
            </p>

            <div className="mt-3 space-y-2">
                {keywords.length === 0 && (
                    <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-400 dark:bg-white/5">
                        {t("system.empty")}
                    </p>
                )}

                {topics.map((topic) => {
                    const children = keywords.filter(
                        (keyword) => keyword.parentKeywordId === topic.id,
                    );
                    const selectedChildCount = children.filter(
                        (keyword) => keyword.selected,
                    ).length;
                    const expanded = expandedTopicIds.has(topic.id);
                    const primaryText = getKeywordPrimaryText(topic);
                    const secondaryText = getKeywordSecondaryText(topic);

                    return (
                        <div
                            key={topic.id}
                            data-testid={`system-keyword-group-${topic.id}`}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]"
                        >
                            <div className="flex items-center gap-1 p-1.5">
                                <button
                                    type="button"
                                    aria-pressed={topic.selected}
                                    disabled={
                                        manager.busyKeywordId !== null ||
                                        !topic.active
                                    }
                                    onClick={() =>
                                        void manager.toggleSystem(topic)
                                    }
                                    data-testid={`system-keyword-${topic.id}`}
                                    className={clsx(
                                        "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition",
                                        topic.selected
                                            ? "bg-blue-50 ring-1 ring-inset ring-blue-300 dark:bg-blue-500/10 dark:ring-blue-400/30"
                                            : "hover:bg-slate-200/70 dark:hover:bg-white/5",
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span
                                            data-testid={`system-keyword-primary-${topic.id}`}
                                            className="block whitespace-normal break-words text-sm font-black leading-5 text-slate-800 dark:text-slate-100"
                                        >
                                            {primaryText}
                                        </span>
                                        <span
                                            data-testid={`system-keyword-meta-${topic.id}`}
                                            className="mt-0.5 block whitespace-normal break-all text-[11px] leading-4 text-slate-400"
                                        >
                                            {secondaryText &&
                                                `${secondaryText} · `}
                                            {t(`types.${topic.type}`)}
                                            {topic.canonicalKey &&
                                                ` · ${topic.canonicalKey}`}
                                        </span>
                                    </span>

                                    <span
                                        className={clsx(
                                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black",
                                            topic.selected
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300",
                                        )}
                                    >
                                        {topic.selected
                                            ? t("selected")
                                            : t("notSelected")}
                                    </span>
                                </button>

                                <span className="shrink-0 px-1 text-[11px] text-slate-400">
                                    {t("system.detailSummary", {
                                        selected: selectedChildCount,
                                        total: children.length,
                                    })}
                                </span>

                                <button
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-controls={`system-keyword-children-${topic.id}`}
                                    aria-label={t(
                                        expanded
                                            ? "system.collapse"
                                            : "system.expand",
                                        { topic: primaryText },
                                    )}
                                    onClick={() => toggleExpanded(topic.id)}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/10"
                                >
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={clsx(
                                            "h-4 w-4 transition-transform",
                                            expanded && "rotate-180",
                                        )}
                                    />
                                </button>
                            </div>

                            {expanded && (
                                <div
                                    id={`system-keyword-children-${topic.id}`}
                                    className="grid grid-cols-1 gap-1.5 border-t border-slate-200 p-2 dark:border-white/10 sm:grid-cols-2"
                                >
                                    {children.length === 0 ? (
                                        <p className="px-1 py-1.5 text-xs text-slate-400 sm:col-span-2">
                                            {t("system.noDetails")}
                                        </p>
                                    ) : (
                                        children.map((keyword) =>
                                            renderKeywordButton(keyword),
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {ungrouped.length > 0 && (
                    <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-dashed border-slate-300 p-2 dark:border-white/15 sm:grid-cols-2">
                        <p className="text-xs font-black text-slate-500 dark:text-slate-300">
                            {t("system.ungrouped")}
                        </p>
                        <div className="hidden sm:block" />
                        {ungrouped.map((keyword) => renderKeywordButton(keyword))}
                    </div>
                )}
            </div>
        </div>
    );
}
