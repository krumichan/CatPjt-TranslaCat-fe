"use client";

import { History, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    DisclosureAllButton,
    DisclosureContent,
    DisclosureToggleButton,
    usePersistentDisclosureMap,
} from "@/components/language-learning/common/LanguageLearningDisclosure";
import { SignalList } from "@/components/language-learning/common/SignalList";
import { SkillRadarChart } from "@/components/language-learning/common/SkillRadarChart";
import { Link } from "@/navigation";
import type { LevelTestHistoryItem, LevelTestStatus } from "@/types/language-learning/level";
import type { LanguageLearningProfile } from "@/types/language-learning/profile";

type ProfileSectionKey =
    | "overview"
    | "levelTest"
    | "strengths"
    | "weaknesses"
    | "focus"
    | "grammar"
    | "errors"
    | "keywords";

const PROFILE_DESKTOP_DEFAULTS: Record<ProfileSectionKey, boolean> = {
    overview: true,
    levelTest: true,
    strengths: true,
    weaknesses: true,
    focus: true,
    grammar: true,
    errors: true,
    keywords: true,
};
const PROFILE_MOBILE_DEFAULTS: Record<ProfileSectionKey, boolean> = {
    overview: true,
    levelTest: false,
    strengths: false,
    weaknesses: false,
    focus: false,
    grammar: false,
    errors: false,
    keywords: false,
};

export function LanguageLearningProfileView({
    profile,
    levelStatus,
    latestLevelTest,
}: {
    profile: LanguageLearningProfile;
    levelStatus: LevelTestStatus | null;
    latestLevelTest: LevelTestHistoryItem | null;
}) {
    const t = useTranslations("LanguageLearning.profile");
    const common = useTranslations("LanguageLearning.common");
    const bandT = useTranslations("LanguageLearning.levelTest.band");
    const disclosure = usePersistentDisclosureMap<ProfileSectionKey>({
        storageKey: "translacat.language-learning.profile.sections.v1",
        desktopDefaults: PROFILE_DESKTOP_DEFAULTS,
        mobileDefaults: PROFILE_MOBILE_DEFAULTS,
    });

    const toggleProps = (key: ProfileSectionKey, contentId: string) => ({
        isOpen: disclosure.state[key],
        onToggle: () => disclosure.toggle(key),
        expandLabel: common("accordion.expand"),
        collapseLabel: common("accordion.collapse"),
        controls: contentId,
        compact: true,
    });

    return (
        <div className="space-y-6" data-testid="language-learning-profile">
            <div className="flex justify-end">
                <DisclosureAllButton
                    allOpen={disclosure.allOpen}
                    onSetAll={disclosure.setAll}
                    expandAllLabel={common("accordion.expandAll")}
                    collapseAllLabel={common("accordion.collapseAll")}
                />
            </div>

            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("sections.overview")}</h2>
                    <DisclosureToggleButton {...toggleProps("overview", "profile-overview-content")} />
                </div>
                <DisclosureContent id="profile-overview-content" isOpen={disclosure.state.overview}>
                    <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                                    {t(`state.${profile.state}`)}
                                </span>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {t("confidence", { value: Math.round(profile.confidence) })}
                                </span>
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t("baseLevel")}</p>
                                    <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{profile.baseLevelScore?.toFixed(1) ?? "-"}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{t("trend")}</p>
                                    <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{profile.trend || "-"}</p>
                                </div>
                            </div>
                            {profile.state === "CALIBRATING" && (
                                <p className="mt-4 rounded-xl bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200">{t("calibrating")}</p>
                            )}
                        </div>
                        <SkillRadarChart scores={profile.skillScores} height={260} />
                    </div>
                </DisclosureContent>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("levelTest.title")}</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {t("levelTest.current", {
                                score: levelStatus?.baseLevelScore == null ? "—" : Math.round(levelStatus.baseLevelScore),
                                band: levelStatus?.proficiencyBand ? bandT(levelStatus.proficiencyBand) : "—",
                            })}
                        </p>
                    </div>
                    <DisclosureToggleButton {...toggleProps("levelTest", "profile-level-test-content")} />
                </div>
                <DisclosureContent id="profile-level-test-content" isOpen={disclosure.state.levelTest}>
                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs text-slate-400">
                                {t("levelTest.lastMeasured", {
                                    date: latestLevelTest?.completedAt
                                        ? new Date(latestLevelTest.completedAt).toLocaleDateString()
                                        : "—",
                                })}
                            </p>
                            {levelStatus?.recheckRecommended && (
                                <p className="mt-2 text-sm font-black text-amber-700 dark:text-amber-200">
                                    {t("levelTest.recheckRecommended")}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {latestLevelTest && (
                                <Link
                                    href={`/language-learning/level-test/history/${latestLevelTest.sessionId}`}
                                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                                >
                                    <History className="h-4 w-4" aria-hidden="true" />
                                    {t("levelTest.latestResult")}
                                </Link>
                            )}
                            <Link
                                href="/language-learning/level-test/history"
                                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                            >
                                {t("levelTest.history")}
                            </Link>
                            <Link
                                href="/language-learning/level-test"
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500"
                            >
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                {levelStatus?.initialLevelTestCompleted ? t("levelTest.recheck") : t("levelTest.start")}
                            </Link>
                        </div>
                    </div>
                </DisclosureContent>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                {([
                    ["strengths", profile.strengths],
                    ["weaknesses", profile.weaknesses],
                    ["focus", profile.recommendedFocus],
                ] as const).map(([key, items]) => {
                    const contentId = `profile-${key}-content`;
                    return (
                        <article key={key} className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="min-w-0 text-lg font-black text-slate-900 dark:text-white">{t(`signals.${key}.title`)}</h2>
                                <DisclosureToggleButton {...toggleProps(key, contentId)} />
                            </div>
                            <DisclosureContent id={contentId} isOpen={disclosure.state[key]}>
                                <div className="mt-4">
                                    <SignalList items={items} emptyText={t(`signals.${key}.empty`)} />
                                </div>
                            </DisclosureContent>
                        </article>
                    );
                })}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <article className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("grammar.title")}</h2>
                        <DisclosureToggleButton {...toggleProps("grammar", "profile-grammar-content")} />
                    </div>
                    <DisclosureContent id="profile-grammar-content" isOpen={disclosure.state.grammar}>
                        <div className="mt-4"><SignalList items={profile.grammarWeaknesses} emptyText={t("grammar.empty")} /></div>
                    </DisclosureContent>
                </article>
                <article className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("errors.title")}</h2>
                        <DisclosureToggleButton {...toggleProps("errors", "profile-errors-content")} />
                    </div>
                    <DisclosureContent id="profile-errors-content" isOpen={disclosure.state.errors}>
                        <div className="mt-4"><SignalList items={profile.errorPatterns} emptyText={t("errors.empty")} /></div>
                    </DisclosureContent>
                </article>
            </section>

            <section className="min-w-0 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{t("keywords.title")}</h2>
                    <DisclosureToggleButton {...toggleProps("keywords", "profile-keywords-content")} />
                </div>
                <DisclosureContent id="profile-keywords-content" isOpen={disclosure.state.keywords}>
                    {profile.keywordMasteries.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-400">{t("keywords.empty")}</p>
                    ) : (
                        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {[...profile.keywordMasteries].sort((a, b) => b.score - a.score).map((keyword) => (
                                <div key={keyword.canonicalKey} className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                                    <div className="flex min-w-0 items-center justify-between gap-3">
                                        <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-black leading-5 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{keyword.canonicalKey}</span>
                                        <span className="shrink-0 text-sm font-black text-blue-600 dark:text-blue-300">{keyword.score.toFixed(0)}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, keyword.score))}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DisclosureContent>
            </section>
        </div>
    );
}
