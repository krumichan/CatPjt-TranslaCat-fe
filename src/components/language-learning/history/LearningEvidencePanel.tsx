"use client";

import { useTranslations } from "next-intl";

import { AppSelect } from "@/components/common/AppSelect";
import { LanguageLearningStateCard } from "@/components/language-learning/common/LanguageLearningStateCard";
import { LearningEvidenceCard } from "@/components/language-learning/history/LearningEvidenceCard";
import { useLearningEvidenceController } from "@/hooks/language-learning/useLearningEvidenceController";
import type { LearningHistorySourceFilter } from "@/types/language-learning/history";
import type { LearningEvidenceResultKind } from "@/types/language-learning/historyEvidence";

export function LearningEvidencePanel({ onOpen }: { onOpen: (activityId: string) => void }) {
    const t = useTranslations("LanguageLearning.history.evidence");
    const sourceT = useTranslations("LanguageLearning.history.unified.source");
    const common = useTranslations("LanguageLearning.common");
    const controller = useLearningEvidenceController();
    const inputClass = "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-black/30 dark:text-white";
    const buttonClass = "rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 dark:border-white/20 dark:text-slate-200";

    return (
        <section data-testid="learning-evidence-panel" aria-labelledby="learning-evidence-title" className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75 sm:p-6">
            <h2 id="learning-evidence-title" className="text-lg font-black text-slate-900 dark:text-white">{t("title")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t("description")}</p>
            <p data-testid="evidence-metadata-scope" className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t("metadataScope")}</p>

            <form onSubmit={(event) => { event.preventDefault(); controller.applyFilter(); }} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {t("from")}
                    <input aria-label={t("from")} type="date" required value={controller.draft.from} max={controller.draft.to} onChange={(event) => controller.updateDraft("from", event.target.value)} className={inputClass} />
                </label>
                <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {t("to")}
                    <input aria-label={t("to")} type="date" required value={controller.draft.to} min={controller.draft.from} onChange={(event) => controller.updateDraft("to", event.target.value)} className={inputClass} />
                </label>
                <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {t("source")}
                    <AppSelect aria-label={t("source")} value={controller.draft.source} onChange={(event) => controller.updateDraft("source", event.target.value as LearningHistorySourceFilter)} className="mt-1 py-2">
                        {(["ALL", "WRITING", "SPEAKING", "LISTENING", "READING", "VOCABULARY", "LEVEL_TEST", "WEB_AI"] as const).map((source) => <option key={source} value={source}>{sourceT(source)}</option>)}
                    </AppSelect>
                </label>
                <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {t("language")}
                    <input aria-label={t("language")} value={controller.draft.learningLanguage} maxLength={20} placeholder={t("allLanguages")} onChange={(event) => controller.updateDraft("learningLanguage", event.target.value)} className={inputClass} />
                </label>
                <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {t("resultKind")}
                    <AppSelect aria-label={t("resultKind")} value={controller.draft.resultKind} onChange={(event) => controller.updateDraft("resultKind", event.target.value as "" | LearningEvidenceResultKind)} className="mt-1 py-2">
                        <option value="">{t("allKinds")}</option>
                        {(["SCORED_EVALUATION", "SESSION_COACHING", "UNKNOWN"] as const).map((kind) => <option key={kind} value={kind}>{t(`kind.${kind}`)}</option>)}
                    </AppSelect>
                </label>
                <label className="min-w-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {t("policy")}
                    <input aria-label={t("policy")} value={controller.draft.policyVersion} maxLength={100} placeholder={t("allPolicies")} onChange={(event) => controller.updateDraft("policyVersion", event.target.value)} className={inputClass} />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                    <button type="submit" className={buttonClass}>{t("apply")}</button>
                    <button type="button" onClick={() => void controller.reload()} disabled={controller.isLoading} className={buttonClass}>{t("refresh")}</button>
                    <p className="self-center text-xs font-normal text-slate-500">{t("rangeNotice")}</p>
                </div>
            </form>

            <div className="mt-4" aria-live="polite">
                {controller.error ? (
                    <LanguageLearningStateCard variant="error" title={common("loadFailedTitle")} message={t("failed")} actionLabel={common("retry")} onAction={() => void controller.reload()} />
                ) : controller.isLoading ? (
                    <LanguageLearningStateCard variant="loading" title={common("loadingTitle")} message={t("loading")} />
                ) : controller.page?.items.length === 0 ? (
                    <p data-testid="evidence-empty" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5">{t("empty")}</p>
                ) : (
                    <div className="grid min-w-0 gap-3 md:grid-cols-2">
                        {controller.page?.items.map((item) => <LearningEvidenceCard key={item.activityId} item={item} onOpen={onOpen} />)}
                    </div>
                )}
            </div>
            <nav aria-label={t("pagination")} className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={!controller.hasPrevious || controller.isLoading} onClick={controller.previous} className={buttonClass}>{t("previous")}</button>
                <button type="button" disabled={!controller.page?.nextCursor || controller.isLoading || Boolean(controller.error)} onClick={controller.next} className={buttonClass}>{t("next")}</button>
            </nav>
        </section>
    );
}
