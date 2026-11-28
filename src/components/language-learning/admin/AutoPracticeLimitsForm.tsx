"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { WEB_AI_AREA_GROUPS } from "@/features/language-learning/web-ai";
import { useQuery } from "@/hooks/useQuery";
import { autoPracticeService, type PracticeLimits } from "@/services/language-learning/autoPracticeService";

/** 管理者が各タイプの一日上限を読み込み、十二項目をまとめて保存する。 */
export function AutoPracticeLimitsForm() {
    const t = useTranslations("LanguageLearning.autoPractice");
    const areas = useTranslations("LanguageLearning.settings.webAi");
    const [edited, setEdited] = useState<PracticeLimits | null>(null);
    const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const query = useQuery({
        keys: ["admin-auto-practice-limits"] as const,
        fetcher: autoPracticeService.limits,
        config: { shouldRetryOnError: false },
    });
    const limits = edited ?? query.data?.limits;

    /** 古い表示を残したまま、保存に成功した値だけをキャッシュに採用する。 */
    async function save(event: FormEvent) {
        event.preventDefault();
        if (limits == null || state === "saving") return;
        setState("saving");
        try {
            const saved = await autoPracticeService.saveLimits(limits);
            await query.mutate(saved, false);
            setEdited(null);
            setState("saved");
        } catch {
            setState("error");
        }
    }

    return (
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <div>
                <h2 className="text-lg font-bold">{t("limitsTitle")}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t("limitsHelp")}</p>
            </div>
            {query.isLoading && <p role="status">{t("loading")}</p>}
            {(query.isError || state === "error") && <p role="alert" className="text-rose-600">{t("error")}</p>}
            {limits && <div className="grid gap-4 md:grid-cols-2">
                {WEB_AI_AREA_GROUPS.map((group) => <fieldset key={group.domain} className="space-y-2 rounded-xl border p-3">
                    <legend className="px-1 font-semibold">{areas(`domains.${group.domain}`)}</legend>
                    {group.areas.map((area) => <label key={area} className="flex items-center justify-between gap-2 text-sm">
                        {areas(`areas.${area}`)}
                        <input className="w-20 rounded-lg border bg-transparent px-2 py-1"
                            required type="number" min={0} max={group.domain === "READING" ? 5 : 100} step={1}
                            disabled={state === "saving"} value={limits[area]}
                            onChange={(event) => {
                                setEdited({ ...limits, [area]: event.target.valueAsNumber || 0 });
                                setState("idle");
                            }} />
                    </label>)}
                </fieldset>)}
            </div>}
            <button type="submit" disabled={edited == null || state === "saving"}
                className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{t("save")}</button>
            {state === "saved" && <p role="status">{t("saved")}</p>}
        </form>
    );
}
