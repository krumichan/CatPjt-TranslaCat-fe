"use client";

import { Check, ChevronDown, LoaderCircle, RotateCcw, Tags, X } from "lucide-react";
import { useTranslations } from "next-intl";

import type { WebAiPlanKeyword } from "@/features/language-learning/web-ai";

interface WebAiScheduleKeywordSettingsProps {
    keywordMode: "DEFAULT" | "CUSTOM";
    keywords: WebAiPlanKeyword[];
    catalog: WebAiPlanKeyword[];
    defaultKeywords: WebAiPlanKeyword[];
    status: "loading" | "ready" | "error";
    onModeChange: (mode: "DEFAULT" | "CUSTOM") => void;
    onKeywordsChange: (keywords: WebAiPlanKeyword[]) => void;
    onRetry: () => void;
    canRetry?: boolean;
}

const CHIP_CLASS = "inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

export function WebAiScheduleKeywordSettings({
    keywordMode,
    keywords,
    catalog,
    defaultKeywords,
    status,
    onModeChange,
    onKeywordsChange,
    onRetry,
    canRetry = true,
}: WebAiScheduleKeywordSettingsProps) {
    const t = useTranslations("LanguageLearning.settings.webAi.keywordSettings");
    const selectedKeys = new Set(keywords.map((keyword) => keyword.key));
    const displayedKeywords = keywordMode === "DEFAULT" ? defaultKeywords : keywords;

    // 계획의 선택 목록만 바꾸며, 공통 키워드 설정이나 다른 계획은 갱신하지 않는다.
    const toggleKeyword = (keyword: WebAiPlanKeyword) => {
        onKeywordsChange(selectedKeys.has(keyword.key)
            ? keywords.filter((item) => item.key !== keyword.key)
            : [...keywords, keyword]);
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] dark:border-blue-300/15 dark:bg-[#172a41] sm:p-5">
            <details className="group">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
                    <Tags className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                    <span className="text-sm font-black text-slate-950 dark:text-white">{t("title")}</span>
                    <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-300">
                        {keywordMode === "DEFAULT" ? t("summaryDefault") : t("summaryCustom", { count: keywords.length })}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-slate-300" aria-hidden="true" />
                </summary>

                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-blue-300/10">
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{t("description")}</p>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-[#102135]" role="group" aria-label={t("title")}>
                        {(["DEFAULT", "CUSTOM"] as const).map((mode) => (
                            <button key={mode} type="button" aria-pressed={keywordMode === mode} onClick={() => onModeChange(mode)} className={`min-h-11 rounded-lg px-2 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${keywordMode === mode
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                                {t(mode === "DEFAULT" ? "defaultMode" : "customMode")}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{t(keywordMode === "DEFAULT" ? "defaultHelp" : "customHelp")}</p>

                    {/* 조회 상태와 별도로 저장된 선택을 유지해, 통신 실패 때에도 계획의 주제를 확인할 수 있다. */}
                    {displayedKeywords.length > 0 && (
                        <div>
                            {keywordMode === "CUSTOM" && <p className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">{t("selectedTitle")}</p>}
                            <div className="flex flex-wrap gap-1.5">
                                {displayedKeywords.map((keyword) => keywordMode === "DEFAULT" ? (
                                    <span key={keyword.key} className={`${CHIP_CLASS} border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200`}>
                                        <span className="break-words [overflow-wrap:anywhere]">{keyword.text}</span>
                                    </span>
                                ) : (
                                    <button key={keyword.key} type="button" onClick={() => toggleKeyword(keyword)} aria-label={t("removeKeyword", { keyword: keyword.text })} className={`${CHIP_CLASS} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-400/25 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25`}>
                                        <span className="break-words [overflow-wrap:anywhere]">{keyword.text}</span>
                                        <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {keywordMode === "CUSTOM" && keywords.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs leading-5 text-slate-500 dark:border-blue-300/15 dark:text-slate-300">{t("customEmpty")}</p>
                    )}
                    {keywordMode === "DEFAULT" && status === "ready" && defaultKeywords.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-xs leading-5 text-slate-500 dark:border-blue-300/15 dark:text-slate-300">{t("defaultEmpty")}</p>
                    )}

                    {/* 선택 가능한 공통 목록을 보여 주되, 버튼은 현재 계획의 사본만 변경한다. */}
                    {keywordMode === "CUSTOM" && catalog.length > 0 && (
                        <fieldset className="border-t border-slate-100 pt-3 dark:border-blue-300/10">
                            <legend className="sr-only">{t("catalogLabel")}</legend>
                            <p className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">{t("catalogTitle")}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {catalog.map((keyword) => (
                                    <button key={keyword.key} type="button" aria-pressed={selectedKeys.has(keyword.key)} onClick={() => toggleKeyword(keyword)} className={`${CHIP_CLASS} ${selectedKeys.has(keyword.key)
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-300/15 dark:bg-[#102135] dark:text-slate-300 dark:hover:bg-blue-500/15"}`}>
                                        {selectedKeys.has(keyword.key) && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                                        <span className="break-words [overflow-wrap:anywhere]">{keyword.text}</span>
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}
                    {keywordMode === "CUSTOM" && status === "ready" && catalog.length === 0 && (
                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t("catalogEmpty")}</p>
                    )}
                    {status === "loading" && (
                        <p role="status" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{t("loading")}
                        </p>
                    )}
                    {status === "error" && (
                        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
                            <p className="min-w-0 flex-1">{t("loadError")}</p>
                            {canRetry && <button type="button" onClick={onRetry} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 font-bold hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:border-amber-300/20 dark:bg-transparent dark:hover:bg-amber-400/10">
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{t("retry")}
                            </button>}
                        </div>
                    )}
                </div>
            </details>
        </section>
    );
}
