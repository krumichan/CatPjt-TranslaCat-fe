"use client";

import { useRef, useState, type ReactNode } from "react";
import {
    BookOpen,
    CalendarDays,
    Check,
    ChevronDown,
    ClipboardCopy,
    Clock3,
    Globe2,
    Headphones,
    Languages,
    Mic2,
    PenLine,
    Sparkles,
    X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useLanguageOptions } from "@/hooks/useLanguageOptions";
import { WebAiScheduleEditorFooter } from "@/components/language-learning/settings/web-ai/WebAiScheduleEditorFooter";
import { WebAiScheduleKeywordSettings } from "@/components/language-learning/settings/web-ai/WebAiScheduleKeywordSettings";
import { Link } from "@/navigation";
import { WEB_AI_AREA_GROUPS } from "@/features/language-learning/web-ai";
import type { WebAiAreaCode, WebAiSchedule, WebAiPlanKeyword } from "@/features/language-learning/web-ai";

const PANEL_CLASS = "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)] dark:border-blue-300/15 dark:bg-[#172a41] sm:p-5";
const INPUT_CLASS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-300/20 dark:bg-[#102135] dark:text-white dark:focus:ring-blue-500/20";
const COUNT_CLASS = "h-9 w-full rounded-lg border border-slate-200 bg-white px-1 text-center text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-blue-300/20 dark:bg-[#102135] dark:text-white dark:focus:ring-blue-500/20 dark:disabled:border-blue-300/10 dark:disabled:bg-white/5 dark:disabled:text-slate-500";
const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 0] as const;
const RECURRENCE_OPTIONS = ["DAILY", "WEEKLY", "MONTHLY"] as const;
const DIFFICULTIES = ["easy", "standard", "hard"] as const;
const DOMAIN_ICONS = {
    WRITING: PenLine,
    READING: BookOpen,
    SPEAKING: Mic2,
    LISTENING: Headphones,
} as const;

interface WebAiScheduleEditorProps {
    schedule: WebAiSchedule;
    onChange: (next: WebAiSchedule) => void;
    onSave: () => void;
    onCopy: () => void;
    onClose: () => void;
    issues: string[];
    notice: "saved" | "saveFailed" | "copied" | "copyFailed" | "prepareFailed" | null;
    prompt: string;
    promptSummary: string;
    questionCount: number;
    baseStatus: "loading" | "ready" | "error";
    keywordStatus: "loading" | "ready" | "error";
    defaultKeywordStatus: "loading" | "ready" | "error";
    keywordCatalog: WebAiPlanKeyword[];
    defaultKeywords: WebAiPlanKeyword[];
    onRetryKeywords: () => void;
    busy?: boolean;
    canCopy?: boolean;
    ready?: boolean;
    integration?: ReactNode;
}

export function WebAiScheduleEditor({
    schedule,
    onChange,
    onSave,
    onCopy,
    onClose,
    issues,
    notice,
    prompt,
    promptSummary,
    questionCount,
    baseStatus,
    keywordStatus,
    defaultKeywordStatus,
    keywordCatalog,
    defaultKeywords,
    onRetryKeywords,
    busy = false,
    canCopy = false,
    ready = true,
    integration,
}: WebAiScheduleEditorProps) {
    const t = useTranslations("LanguageLearning.settings.webAi");
    const languageOptions = useLanguageOptions([schedule.originLanguage, schedule.learningLanguage, schedule.feedbackLanguage]);
    const actualPrompt = useRef<HTMLTextAreaElement>(null);
    const [activeDomain, setActiveDomain] = useState<string>(() =>
        WEB_AI_AREA_GROUPS.find((group) => schedule.areas.some((area) =>
            area.code === group.domain || group.areas.some((code) => code === area.code),
        ))?.domain ?? "WRITING",
    );

    const selectedMonthDates = [...new Set(schedule.monthDays)]
        .sort((a, b) => a - b)
        .map((day) => t("monthDayValue", { day }));
    if (schedule.includeLastDay) selectedMonthDates.push(t("lastDayShort"));

    // 분야 탭은 표시할 표를 고르고, 실제 출제 유형은 표 안의 체크박스로 선택한다.
    const domainAreas = (domain: string) => {
        const group = WEB_AI_AREA_GROUPS.find((item) => item.domain === domain);
        const codes = new Set<string>([domain, ...(group?.areas ?? [])]);
        return schedule.areas.filter((area) => codes.has(area.code));
    };

    const countForDomain = (domain: string) => domainAreas(domain)
        .reduce((sum, area) => sum + area.easy + area.standard + area.hard, 0);

    // 요일과 일자는 선택 순서와 관계없이 현재 계획에서만 갱신한다.
    const toggleWeekday = (day: number) => {
        const weekdays = schedule.weekdays.includes(day)
            ? schedule.weekdays.filter((value) => value !== day)
            : [...schedule.weekdays, day];
        onChange({ ...schedule, weekdays });
    };

    const toggleMonthDay = (day: number) => {
        const monthDays = schedule.monthDays.includes(day)
            ? schedule.monthDays.filter((value) => value !== day)
            : [...schedule.monthDays, day];
        onChange({ ...schedule, monthDays });
    };

    // 각 세부 유형은 독립적인 문제 묶음이며, 선택 시 적정 1문제로 시작한다.
    const toggleArea = (code: WebAiAreaCode) => {
        const exists = schedule.areas.some((area) => area.code === code);
        const areas = exists
            ? schedule.areas.filter((area) => area.code !== code)
            : [...schedule.areas, { code, easy: 0, standard: 1, hard: 0 }];
        onChange({ ...schedule, areas });
    };

    const updateAreaCount = (
        code: WebAiAreaCode,
        difficulty: (typeof DIFFICULTIES)[number],
        value: number,
    ) => {
        onChange({
            ...schedule,
            areas: schedule.areas.map((area) =>
                area.code === code ? { ...area, [difficulty]: value } : area,
            ),
        });
    };

    // 모바일 수량 버튼은 기본 난이도인 적정을 먼저 조정한다. 다른 난이도는 상세 영역에서 바꿀 수 있다.
    const adjustAreaTotal = (code: WebAiAreaCode, change: 1 | -1) => {
        const area = schedule.areas.find((item) => item.code === code);
        if (!area) return;

        if (change === 1) {
            updateAreaCount(code, "standard", area.standard + 1);
            return;
        }

        const difficulty = (["standard", "easy", "hard"] as const)
            .find((candidate) => area[candidate] > 0);
        if (difficulty) updateAreaCount(code, difficulty, area[difficulty] - 1);
    };

    return (
        <section className={`min-w-0 space-y-3 [--color-blue-500:#3188ff] [--color-blue-600:#1677ff] ${issues.length > 0 ? "pb-64" : notice ? "pb-44" : "pb-32"}`} data-testid="web-ai-schedule-editor">
            <header className="hidden items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-blue-300/15 dark:bg-[#172a41] xl:flex">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">{t("editorEyebrow")}</p>
                    <h2 className="mt-0.5 text-xl font-black text-slate-950 dark:text-white">{schedule.name.trim() || t("editorTitle")}</h2>
                </div>
                <button type="button" disabled={busy} onClick={onClose} aria-label={t("close")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10">
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </header>

            {/* 준비 조건을 충족하지 못하면 입력만 잠그고 복구는 상단 체크리스트에서 안내한다. */}
            <fieldset disabled={busy || !ready} className="min-w-0 space-y-3 border-0 p-0">
            <section aria-labelledby="web-ai-plan-basics" className={PANEL_CLASS}>
                <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                    <h3 id="web-ai-plan-basics" className="text-sm font-black text-slate-950 dark:text-white">{t("basicsTitle")}</h3>
                </div>
                <div className="mt-3 space-y-3">
                    <label className="block">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("name")}</span>
                        <input type="text" value={schedule.name} maxLength={80} onChange={(event) => onChange({ ...schedule, name: event.target.value })} placeholder={t("namePlaceholder")} className={`mt-1 ${INPUT_CLASS}`} />
                    </label>
                    <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-[#102135]" data-testid="web-ai-inherited-languages">
                        {(["originLanguage", "learningLanguage", "feedbackLanguage"] as const).map((field) => (
                            <div key={field} className="min-w-0">
                                <dt className="truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">{t(field)}</dt>
                                <dd className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
                                    {baseStatus === "ready" ? languageOptions.find((language) => language.code === schedule[field])?.label ?? schedule[field] : "—"}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <p className="text-slate-500 dark:text-slate-400">{t("inheritedLanguagesHelp")}</p>
                        <Link href="/language-learning/settings" className="font-bold text-blue-700 dark:text-blue-300">{t("manageLanguages")}</Link>
                    </div>
                    {baseStatus !== "ready" && (
                        <div role={baseStatus === "error" ? "alert" : "status"} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                            <p>{t(baseStatus === "loading" ? "baseLanguagesLoading" : "baseLanguagesUnavailable")}</p>
                        </div>
                    )}
                </div>
            </section>

            <section aria-labelledby="web-ai-plan-recurrence" className={PANEL_CLASS}>
                <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">1</span>
                    <h3 id="web-ai-plan-recurrence" className="text-lg font-black text-slate-950 dark:text-white">{t("scheduleTitle")}</h3>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start lg:gap-6">
                    <div className="min-w-0 space-y-3">
                        <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-[#102135]" role="group" aria-label={t("recurrenceLabel")}>
                            {RECURRENCE_OPTIONS.map((option) => (
                                <button key={option} type="button" aria-pressed={schedule.recurrence === option} onClick={() => onChange({ ...schedule, recurrence: option })} className={`min-h-11 rounded-[9px] text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${schedule.recurrence === option
                                    ? "bg-blue-600 text-white shadow-[0_3px_10px_rgba(22,119,255,0.22)]"
                                    : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                                    {t(`recurrence.${option}`)}
                                </button>
                            ))}
                        </div>
                        {schedule.recurrence === "DAILY" && (
                            <p className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 text-sm font-semibold text-blue-700 dark:border-blue-400/15 dark:bg-blue-500/10 dark:text-blue-200">
                                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {t("dailyHelp")}
                            </p>
                        )}
                        {schedule.recurrence === "WEEKLY" && (
                            <fieldset>
                                <legend className="sr-only">{t("weekdayLabel")}</legend>
                                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <button key={day} type="button" aria-pressed={schedule.weekdays.includes(day)} onClick={() => toggleWeekday(day)} className={`h-11 min-w-0 rounded-xl border text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${schedule.weekdays.includes(day)
                                            ? "border-blue-600 bg-blue-600 text-white shadow-[0_3px_10px_rgba(22,119,255,0.18)]"
                                            : "border-slate-200/80 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-300/10 dark:bg-[#20364e] dark:text-slate-300 dark:hover:bg-blue-500/15"}`}>
                                            {t(`weekday.${day}`)}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                        {schedule.recurrence === "MONTHLY" && (
                            <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-blue-300/15 dark:bg-[#102135]/40">
                                <legend className="sr-only">{t("monthDayLabel")}</legend>
                                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                                    <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                                    <span>{t("monthDayLabel")}</span>
                                </div>
                                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                                    {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                                        <button key={day} type="button" aria-pressed={schedule.monthDays.includes(day)} onClick={() => toggleMonthDay(day)} className={`h-11 min-w-0 rounded-xl border text-sm font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${schedule.monthDays.includes(day)
                                            ? "border-blue-600 bg-blue-600 text-white shadow-[0_2px_7px_rgba(22,119,255,0.18)]"
                                            : "border-slate-200/70 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-300/10 dark:bg-[#20364e] dark:text-slate-300 dark:hover:bg-blue-500/15"}`}>
                                            {day}
                                        </button>
                                    ))}
                                    <label className={`col-span-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500 sm:text-sm ${schedule.includeLastDay
                                        ? "border-blue-600 bg-blue-600 text-white shadow-[0_2px_7px_rgba(22,119,255,0.18)]"
                                        : "border-slate-200/70 bg-white text-slate-600 hover:border-blue-300 dark:border-blue-300/10 dark:bg-[#20364e] dark:text-slate-300"}`}>
                                        <input type="checkbox" checked={schedule.includeLastDay} onChange={(event) => onChange({ ...schedule, includeLastDay: event.target.checked })} className="sr-only" />
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${schedule.includeLastDay ? "border-white/60 bg-white/15" : "border-slate-300 dark:border-slate-500"}`} aria-hidden="true">
                                            {schedule.includeLastDay && <Check className="h-3 w-3" />}
                                        </span>
                                        {t("includeLastDay")}
                                    </label>
                                </div>
                                {selectedMonthDates.length > 0 && (
                                    <p className="mt-3 border-t border-slate-200/70 pt-2 text-xs font-semibold leading-5 text-blue-700 dark:border-blue-300/10 dark:text-blue-200">
                                        {selectedMonthDates.join(" · ")}
                                    </p>
                                )}
                                <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{t("missingMonthDayHelp")}</p>
                            </fieldset>
                        )}
                    </div>
                    <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-blue-300/15 dark:bg-[#102135]/40">
                        <label className="flex min-h-11 items-center gap-2.5">
                            <Clock3 className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" aria-hidden="true" />
                            <span className="shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("time")}</span>
                            <input type="time" value={schedule.time} onChange={(event) => onChange({ ...schedule, time: event.target.value })} className="ml-auto h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-300/15 dark:bg-[#172a41] dark:text-white dark:focus:ring-blue-500/20" />
                        </label>
                        <label className="flex min-h-10 items-center gap-2.5">
                            <Globe2 className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                            <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{t("timezone")}</span>
                            <input type="text" list="web-ai-timezones" value={schedule.timezone} onChange={(event) => onChange({ ...schedule, timezone: event.target.value })} className="ml-auto h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 text-right text-xs font-medium text-slate-600 outline-none focus:border-blue-300 focus:bg-white dark:text-slate-300 dark:focus:bg-[#172a41]" placeholder="Asia/Tokyo" />
                            <datalist id="web-ai-timezones"><option value="Asia/Tokyo" /><option value="Asia/Seoul" /><option value="UTC" /></datalist>
                        </label>
                    </div>
                </div>
            </section>

            <section aria-labelledby="web-ai-plan-areas" className={PANEL_CLASS}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">2</span>
                        <div>
                            <h3 id="web-ai-plan-areas" className="text-lg font-black text-slate-950 dark:text-white">{t("areasTitle")}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t("areasDescription")}</p>
                        </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">{t("questionCount", { count: questionCount })}</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1.5" role="tablist" aria-label={t("domainLabel")}>
                    {WEB_AI_AREA_GROUPS.map((group) => {
                        const Icon = DOMAIN_ICONS[group.domain];
                        const selected = domainAreas(group.domain).length > 0;
                        return (
                            <button key={group.domain} type="button" role="tab" aria-selected={activeDomain === group.domain} onClick={() => setActiveDomain(group.domain)} className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border px-1 text-[11px] font-black transition sm:gap-2 sm:text-sm ${activeDomain === group.domain
                                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                : selected
                                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 dark:border-blue-300/15 dark:bg-[#20364e] dark:text-slate-300"}`}>
                                <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
                                {selected && <Check className="h-3 w-3 shrink-0 sm:hidden" aria-hidden="true" />}
                                <span className="truncate">{t(`domains.${group.domain}`)}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 space-y-2">
                    {WEB_AI_AREA_GROUPS.filter((group) => group.domain === activeDomain || domainAreas(group.domain).length > 0).map((group) => {
                        const expanded = group.domain === activeDomain;
                        const Icon = DOMAIN_ICONS[group.domain];
                        const legacyArea = schedule.areas.find((area) => area.code === group.domain);
                        const selectedAreas = schedule.areas.filter((area) =>
                            group.areas.some((code) => code === area.code),
                        );
                        const difficultyTotals = DIFFICULTIES.map((difficulty) =>
                            selectedAreas.reduce((sum, area) => sum + area[difficulty], 0),
                        );
                        return (
                            <div key={group.domain} className="overflow-hidden rounded-xl border border-slate-200 dark:border-blue-300/15">
                                <button type="button" aria-expanded={expanded} onClick={() => setActiveDomain(group.domain)} className={`flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-black ${expanded
                                    ? "bg-slate-50 text-slate-900 dark:bg-[#20364e] dark:text-white"
                                    : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-[#172a41] dark:text-slate-200 dark:hover:bg-[#20364e]"}`}>
                                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{t(`domains.${group.domain}`)}</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{t("questionCount", { count: countForDomain(group.domain) })}</span>
                                    <ChevronDown className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                                </button>
                                {expanded && (
                                    <div role="tabpanel" className="bg-white dark:bg-[#172a41]">
                                        <div className="grid grid-cols-[minmax(0,1fr)_6.75rem] gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-xs font-bold text-slate-500 dark:border-blue-300/10 dark:bg-[#20364e]/60 dark:text-slate-300 sm:grid-cols-[minmax(0,1fr)_repeat(3,4.25rem)]">
                                            <span>{t("domainLabel")}</span>
                                            <span className="text-center sm:hidden">{t("countLabel")}</span>
                                            {DIFFICULTIES.map((difficulty) => <span key={difficulty} className="hidden text-center sm:block">{t(`difficulty.${difficulty}`)}</span>)}
                                        </div>
                                        {group.areas.map((code) => {
                                            const area = schedule.areas.find((item) => item.code === code);
                                            const areaTotal = area ? area.easy + area.standard + area.hard : 0;
                                            return (
                                                <div key={code} className={`grid grid-cols-[minmax(0,1fr)_6.75rem] items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-blue-300/10 sm:grid-cols-[minmax(0,1fr)_repeat(3,4.25rem)] ${area ? "bg-blue-50/35 dark:bg-blue-500/5" : ""}`}>
                                                    <label className="flex min-w-0 cursor-pointer items-center gap-1.5 sm:gap-2">
                                                        <input type="checkbox" checked={Boolean(area)} onChange={() => toggleArea(code)} className="h-4 w-4 shrink-0 accent-blue-600" />
                                                        <span className="min-w-0 truncate text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm" title={t(`areas.${code}`)}>{t(`areas.${code}`)}</span>
                                                    </label>
                                                    {/* 선택을 해제해도 입력 요소를 유지해 행 높이가 바뀌지 않게 한다. */}
                                                    <div className={`flex h-9 items-center overflow-hidden rounded-lg border border-slate-200 dark:border-blue-300/20 sm:hidden ${area ? "bg-white dark:bg-[#102135]" : "bg-slate-100 dark:border-blue-300/10 dark:bg-white/5"}`}>
                                                        <button type="button" aria-label={t("decreaseCount", { area: t(`areas.${code}`) })} onClick={() => adjustAreaTotal(code, -1)} disabled={!area || areaTotal === 0} className="h-full w-8 shrink-0 border-r border-slate-200 text-lg text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-blue-300/20 dark:text-slate-200">−</button>
                                                        <input type="text" readOnly tabIndex={-1} aria-label={`${t(`areas.${code}`)} ${t("countLabel")}`} value={areaTotal} disabled={!area} className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-sm font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:text-slate-400 dark:text-white dark:disabled:text-slate-500" />
                                                        <button type="button" aria-label={t("increaseCount", { area: t(`areas.${code}`) })} onClick={() => adjustAreaTotal(code, 1)} disabled={!area} className="h-full w-8 shrink-0 border-l border-slate-200 text-lg text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-blue-300/20 dark:text-slate-200">+</button>
                                                    </div>
                                                    {DIFFICULTIES.map((difficulty) => (
                                                        <label key={difficulty} className="hidden min-w-0 sm:block">
                                                            <span className="sr-only">{t(`difficulty.${difficulty}`)}</span>
                                                            <input type="number" min={0} step={1} inputMode="numeric" value={area?.[difficulty] ?? 0} disabled={!area} onChange={(event) => updateAreaCount(code, difficulty, Number(event.target.value))} className={COUNT_CLASS} />
                                                        </label>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                        {selectedAreas.length > 0 && (
                                            <details className="group border-t border-slate-100 dark:border-blue-300/10 sm:hidden">
                                                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 bg-slate-50 px-3 text-xs font-bold text-slate-700 dark:bg-[#20364e] dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                                                    <span>{t("difficultyDetails")}</span>
                                                    <span className="min-w-0 flex-1 truncate text-right text-[11px] font-normal text-slate-500 dark:text-slate-300">{DIFFICULTIES.map((difficulty, index) => `${t(`difficulty.${difficulty}`)} ${difficultyTotals[index]}`).join(" · ")}</span>
                                                    <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
                                                </summary>
                                                <div className="space-y-3 p-3">
                                                    {selectedAreas.map((area) => (
                                                        <div key={area.code}>
                                                            <p className="mb-1 text-xs font-black text-slate-800 dark:text-slate-100">{t(`areas.${area.code}`)}</p>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {DIFFICULTIES.map((difficulty) => (
                                                                    <label key={difficulty} className="min-w-0">
                                                                        <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">{t(`difficulty.${difficulty}`)}</span>
                                                                        <input type="number" min={0} step={1} inputMode="numeric" value={area[difficulty]} onChange={(event) => updateAreaCount(area.code, difficulty, Number(event.target.value))} className={`mt-1 ${COUNT_CLASS}`} />
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">{t("countStepHelp")}</p>
                                                </div>
                                            </details>
                                        )}
                                        {legacyArea && (
                                            <div className="border-t border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                                                <p className="font-black">{t("legacyAreaTitle")}: {t("questionCount", { count: legacyArea.easy + legacyArea.standard + legacyArea.hard })}</p>
                                                <p className="mt-1">{t("difficulty.easy")} {legacyArea.easy} · {t("difficulty.standard")} {legacyArea.standard} · {t("difficulty.hard")} {legacyArea.hard}</p>
                                                <p className="mt-1 leading-5">{t("legacyAreaHelp")}</p>
                                                <button type="button" onClick={() => onChange({ ...schedule, areas: schedule.areas.filter((area) => area.code !== group.domain) })} className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-2 font-bold text-amber-900 hover:bg-amber-100 dark:border-amber-300/30 dark:bg-transparent dark:text-amber-100">
                                                    {t("legacyAreaRemove")}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{t("unlimitedHelp")}</p>
                <details className="group mt-3 border-t border-slate-100 pt-3 dark:border-blue-300/10">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                        {t("focusTitle")}
                        <ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <label className="block">
                        <span className="sr-only">{t("focusTitle")}</span>
                        <textarea value={schedule.focus} onChange={(event) => onChange({ ...schedule, focus: event.target.value })} rows={2} maxLength={1000} placeholder={t("focusPlaceholder")} className={`mt-2 resize-y ${INPUT_CLASS}`} />
                    </label>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{t("feedbackDescription")}</p>
                </details>
            </section>

            <WebAiScheduleKeywordSettings
                keywordMode={schedule.keywordMode}
                keywords={schedule.keywords}
                catalog={keywordCatalog}
                defaultKeywords={defaultKeywords}
                status={schedule.keywordMode === "DEFAULT" ? defaultKeywordStatus : keywordStatus}
                onModeChange={(keywordMode) => onChange({ ...schedule, keywordMode })}
                onKeywordsChange={(keywords) => onChange({ ...schedule, keywords })}
                onRetry={onRetryKeywords}
                canRetry={ready}
            />

            <section aria-labelledby="web-ai-plan-preview" className={PANEL_CLASS}>
                <details className="group" open={prompt ? true : undefined}>
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
                        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-sm">3</span>
                        <h3 id="web-ai-plan-preview" className="text-lg font-black text-slate-950 dark:text-white">{t("promptPreviewTitle")}</h3>
                        <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">{t("promptPreviewHelp")}</span>
                        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-slate-300" aria-hidden="true" />
                    </summary>
                    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-blue-300/10">
                        <p className="mb-3 text-xs leading-6 text-slate-500 dark:text-slate-300">{t(prompt ? "actualPromptHelp" : "promptSummaryHelp")}</p>
                        {prompt ? (
                            <textarea ref={actualPrompt} aria-label={t("actualPrompt")} readOnly value={prompt} rows={12} className="max-h-96 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-6 text-slate-700 dark:border-blue-300/15 dark:bg-[#102135] dark:text-slate-200" />
                        ) : promptSummary ? (
                            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-sans text-xs leading-6 text-slate-700 dark:bg-[#102135] dark:text-slate-200">{promptSummary}</pre>
                        ) : (
                            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-blue-300/15 dark:text-slate-400">{t("promptPreviewEmpty")}</p>
                        )}
                        <button type="button" onClick={onCopy} disabled={!canCopy || busy} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                            <ClipboardCopy className="h-4 w-4" aria-hidden="true" />{t("copyPrompt")}
                        </button>
                        {prompt && <button type="button" disabled={busy} onClick={() => { actualPrompt.current?.focus(); actualPrompt.current?.select(); }} className="ml-2 mt-3 min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-white/15 dark:text-slate-200">{t("selectPrompt")}</button>}
                    </div>
                </details>
            </section>

            </fieldset>

            {/* 준비 상태 재검사 중에도 연동 해제와 미제출 결과 입력을 보존한다. */}
            <fieldset disabled={busy} className="min-w-0 border-0 p-0">{integration}</fieldset>

            <WebAiScheduleEditorFooter
                onSave={onSave}
                onCopy={onCopy}
                canCopy={canCopy}
                canSave={ready}
                busy={busy}
                issues={issues}
                notice={notice}
            />
        </section>
    );
}
