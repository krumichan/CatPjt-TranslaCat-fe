"use client";

import { BookOpenText, CheckCircle2, Compass, Layers3, LoaderCircle, Network, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LanguageLearningOnboardingCard } from "@/components/language-learning/common/LanguageLearningOnboardingCard";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LanguageLearningPageLayout } from "@/components/language-learning/layout/LanguageLearningPageLayout";
import { useLanguageLearningEntryState } from "@/hooks/language-learning/useLanguageLearningEntryState";
import { isGenerationPending } from "@/features/language-learning/generationState";
import { useRouter } from "@/navigation";
import { readingVocabularyService } from "@/services/language-learning/readingVocabularyService";
import type {
    PracticeDomain,
    PracticeTodayModeStatus,
    VocabularyMasterySummary,
} from "@/types/language-learning/practice";

const READING_MODES = [
    { key: "COMPREHENSION", icon: BookOpenText },
    { key: "STRUCTURE", icon: Layers3 },
    { key: "CONTEXT_INFERENCE", icon: Compass },
] as const;

const VOCABULARY_MODES = [
    { key: "MEANING_RELATION", icon: Network },
    { key: "USAGE_DISTINCTION", icon: Sparkles },
    { key: "COMPOSITION", icon: Layers3 },
] as const;

export function PracticeModeLandingPage({ domain }: { domain: PracticeDomain }) {
    const entry = useLanguageLearningEntryState();
    const router = useRouter();
    const ns = domain === "READING" ? "LanguageLearning.reading" : "LanguageLearning.vocabulary";
    const t = useTranslations(ns);
    const common = useTranslations("LanguageLearning.common");
    const generation = useTranslations("LanguageLearning.generation");
    const [startingMode, setStartingMode] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [mastery, setMastery] = useState<VocabularyMasterySummary | null>(null);
    const [todayStatuses, setTodayStatuses] = useState<PracticeTodayModeStatus[]>([]);
    const modes = domain === "READING" ? READING_MODES : VOCABULARY_MODES;
    const evaluatedVocabularyCount = mastery ? mastery.total - mastery.newCount : 0;
    const statusByMode = new Map(todayStatuses.map((status) => [status.mode, status]));
    const completedModeCount = modes.filter(({ key }) => statusByMode.get(key)?.status === "COMPLETED").length;

    useEffect(() => {
        if (!entry.setting?.configured || entry.levelStatus?.profileState === "LEVEL_TEST_REQUIRED") return;
        let cancelled = false;
        void readingVocabularyService.getTodayStatus(domain)
            .then((value) => { if (!cancelled) setTodayStatuses(value); })
            .catch(() => { if (!cancelled) setTodayStatuses([]); });
        return () => { cancelled = true; };
    }, [domain, entry.levelStatus?.profileState, entry.setting?.configured]);

    useEffect(() => {
        if (domain !== "VOCABULARY" || !entry.setting?.configured) return;
        let cancelled = false;
        void readingVocabularyService.getVocabularyMastery()
            .then((value) => { if (!cancelled) setMastery(value); })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, [domain, entry.setting?.configured]);

    const hasGeneratingMode = todayStatuses.some((status) => isGenerationPending(status.generationStatus));
    useEffect(() => {
        if (!hasGeneratingMode) return;
        let cancelled = false;
        let timer: number;
        const poll = async () => {
            try {
                const statuses = await readingVocabularyService.getTodayStatus(domain);
                if (!cancelled) setTodayStatuses(statuses);
            } catch {
                // Keep displayed progress through a transient status read failure.
            } finally {
                if (!cancelled) timer = window.setTimeout(poll, 2000);
            }
        };
        timer = window.setTimeout(poll, 2000);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [domain, hasGeneratingMode]);

    const start = async (mode: string) => {
        if (startingMode) return;
        const existing = statusByMode.get(mode);
        const segment = domain === "READING" ? "reading" : "vocabulary";
        if (existing?.practiceSetId) {
            router.push(`/language-learning/${segment}/session/${existing.practiceSetId}`);
            return;
        }
        setStartingMode(mode);
        setError(false);
        try {
            const set = await readingVocabularyService.getToday(domain, mode);
            router.push(`/language-learning/${segment}/session/${set.practiceSetId}`);
        } catch {
            setError(true);
        } finally {
            setStartingMode(null);
        }
    };

    let content;
    if (entry.isLoading) {
        content = <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("loading")} />;
    } else if (entry.settingError || entry.levelStatusError) {
        content = <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("loadFailed")} actionLabel={common("retry")} onAction={() => void entry.reload()} />;
    } else if (!entry.setting?.configured) {
        content = <LanguageLearningOnboardingCard mode="SETTING" />;
    } else if (entry.levelStatus?.profileState === "LEVEL_TEST_REQUIRED") {
        content = <LanguageLearningOnboardingCard mode="LEVEL_TEST" />;
    } else {
        content = (
            <div className="space-y-5">
                {error && (
                    <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("startFailed")} />
                )}
                {domain === "VOCABULARY" && mastery && mastery.total > 0 && (
                    <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">{t("mastery.eyebrow")}</p>
                                <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{t("mastery.title")}</h2>
                            </div>
                            <div className="rounded-2xl bg-blue-50 px-4 py-2 text-right dark:bg-blue-500/10">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-500 dark:text-blue-300">{t("mastery.averageLabel")}</p>
                                <p className="mt-0.5 text-xl font-black text-blue-700 dark:text-blue-200">
                                    {evaluatedVocabularyCount > 0 ? Math.round(mastery.averageScore) : "—"}
                                    <span className="ml-1 text-xs text-blue-500 dark:text-blue-300">/ 100</span>
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                            {(["newCount", "learningCount", "familiarCount", "strongCount", "masteredCount"] as const).map((key) => (
                                <div key={key} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{mastery[key]}</p>
                                    <p className="mt-1 text-[11px] font-bold text-slate-400">{t(`mastery.${key}`)}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-xs leading-5 text-slate-400">{t("mastery.note")}</p>
                    </section>
                )}
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                    <div className="max-w-2xl">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">{t("selector.eyebrow")}</p>
                        <h2 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl dark:text-white">{t("selector.title")}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t("selector.description")}</p>
                        {completedModeCount > 0 && (
                            <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                                {t("selector.completedCount", { completed: completedModeCount, total: modes.length })}
                            </p>
                        )}
                    </div>
                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        {modes.map(({ key, icon: Icon }) => {
                            const busy = startingMode === key;
                            const todayStatus = statusByMode.get(key);
                            const completed = todayStatus?.status === "COMPLETED";
                            const active = todayStatus?.status === "ACTIVE";
                            const generating = isGenerationPending(todayStatus?.generationStatus);
                            const generationFailed = todayStatus?.generationStatus === "PARTIAL" || todayStatus?.generationStatus === "FAILED";
                            const actionLabel = completed
                                ? t("selector.viewResult")
                                : active
                                    ? t("selector.continue")
                                    : t("selector.start");
                            return (
                                <article
                                    key={key}
                                    className={`flex h-full flex-col rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                                        completed
                                            ? "border-emerald-200 bg-emerald-50/70 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                                            : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/10"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300">
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        {completed && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                {t("selector.completed")}
                                            </span>
                                        )}
                                        {active && (
                                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                                                {t("selector.progress", { answered: todayStatus.answeredCount, total: todayStatus.questionCount })}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="mt-5 text-base font-black text-slate-900 sm:text-lg dark:text-white">{t(`modes.${key}.title`)}</h3>
                                    <p className="mt-2 min-h-18 text-sm leading-6 text-slate-500 dark:text-slate-400">{t(`modes.${key}.description`)}</p>
                                    {(generating || generationFailed) && todayStatus && (
                                        <div className="mt-3 text-xs leading-5" aria-live="polite">
                                            <p className="font-black text-blue-700 dark:text-blue-200">{generation("progress", { ready: todayStatus.generatedQuestionCount ?? 0, total: todayStatus.questionCount })}</p>
                                            <p className={generationFailed ? "text-amber-700 dark:text-amber-200" : "text-slate-500 dark:text-slate-400"}>{generation(generationFailed ? "failed" : "background")}</p>
                                        </div>
                                    )}
                                    {completed && todayStatus.officialScore != null && (
                                        <p className="mt-3 text-xs font-black text-emerald-700 dark:text-emerald-200">
                                            {t("selector.score", { score: Math.round(todayStatus.officialScore) })}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-5">
                                        <button type="button" onClick={() => void start(key)} disabled={Boolean(startingMode)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-base font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
                                            {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                            {busy ? t("selector.starting") : actionLabel}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{t("selector.notice")}</p>
                </section>
            </div>
        );
    }

    return <LanguageLearningPageLayout title={t("title")} description={t("description")}>{content}</LanguageLearningPageLayout>;
}
