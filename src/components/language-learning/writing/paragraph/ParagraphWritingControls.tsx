"use client";

import { useTranslations } from "next-intl";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { ParagraphWritingConfig, ParagraphWritingPlan, ParagraphWritingPreview } from "@/types/language-learning/paragraphWriting";

interface Props {
    config: ParagraphWritingConfig;
    type: DailyWritingType;
    target: string;
    parsedTarget: number | null;
    rePractice: boolean;
    historyDate: string;
    busy: boolean;
    plan: ParagraphWritingPlan | null;
    preview: ParagraphWritingPreview | null;
    onType: (value: DailyWritingType) => void;
    onTarget: (value: string) => void;
    onRePractice: (value: boolean) => void;
    onHistoryDate: (value: string) => void;
    onPreview: () => void;
    onStart: (allowPartial: boolean) => void;
    onExpand: () => void;
    onRestore: () => void;
    onRefresh: () => void;
    onHistory: () => void;
}

export function ParagraphWritingControls(props: Props) {
    const t = useTranslations("ParagraphWriting");
    const button = "rounded-xl border border-slate-300 px-4 py-2 font-semibold disabled:opacity-50 dark:border-white/20";

    return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
            <fieldset disabled={props.busy} className="flex flex-wrap gap-2">
                <legend className="mb-2 font-semibold">{t("type")}</legend>
                {(["TRANSLATION", "GUIDED", "FREE"] as const).map((type) => (
                    <button key={type} type="button" className={button} aria-pressed={props.type === type} onClick={() => props.onType(type)}>
                        {t(`types.${type}`)}
                    </button>
                ))}
            </fieldset>
            <div className="flex flex-wrap items-end gap-3">
                <label className="block font-semibold" htmlFor="paragraph-target">
                    {t("target")}
                    <input id="paragraph-target" type="text" inputMode="numeric" value={props.target} disabled={props.busy}
                        onChange={(event) => props.onTarget(event.target.value)} aria-describedby="paragraph-target-range" aria-invalid={props.parsedTarget === null}
                        className="mt-1 block w-36 rounded-lg border border-slate-300 bg-transparent p-2" />
                </label>
                <button type="button" className={button} disabled={props.busy || props.parsedTarget === null} onClick={props.onPreview}>{t("preview")}</button>
                {props.plan && <button type="button" className={button}
                    disabled={props.busy || props.parsedTarget === null || props.parsedTarget <= props.plan.targetItemCount} onClick={props.onExpand}>{t("expand")}</button>}
            </div>
            <p id="paragraph-target-range" className="text-sm">{t("range", { min: props.config.minTargetItemCount, max: props.config.maxTargetItemCount })}</p>
            {props.parsedTarget === null && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("invalidTarget")}</p>}
            {props.plan && <p className="text-sm">{t("expandHint")}</p>}
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={props.rePractice} disabled={props.busy} onChange={(event) => props.onRePractice(event.target.checked)} />
                {t("rePractice")}
            </label>
            {props.preview && <div role="status" className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <p>{t("previewCounts", { target: props.preview.targetItemCount, acquired: props.preview.acquiredItemCount, remaining: props.preview.remainingItemCount })}</p>
                {props.preview.remainingItemCount > 0 && <p>{t("partialNotice")}</p>}
                <button type="button" className={button} disabled={props.busy}
                    onClick={() => props.onStart(props.preview!.requiresPartialConsent)}>
                    {t(props.preview.requiresPartialConsent ? "startPartial" : "start")}
                </button>
            </div>}
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("inventoryOnly")}</p>
            {props.plan?.remainingItemCount ? <p className="text-sm">{t("restoreBatch", { count: props.config.workerBatchSize })}</p> : null}
            <div className="flex flex-wrap items-end gap-3">
                {props.plan && <>
                    <button type="button" className={button} disabled={props.busy} onClick={props.onRefresh}>{t("refresh")}</button>
                    <button type="button" className={button} disabled={props.busy || props.plan.remainingItemCount === 0} onClick={props.onRestore}>{t("restore")}</button>
                </>}
                <label className="text-sm font-semibold">{t("historyDate")}
                    <input type="date" value={props.historyDate} disabled={props.busy} onChange={(event) => props.onHistoryDate(event.target.value)}
                        className="ml-2 rounded-lg border border-slate-300 bg-transparent p-2" />
                </label>
                <button type="button" className={button} disabled={props.busy || !props.historyDate} onClick={props.onHistory}>{t("history")}</button>
            </div>
        </section>
    );
}
