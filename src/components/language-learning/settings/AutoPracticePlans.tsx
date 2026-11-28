"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { WEB_AI_AREA_GROUPS } from "@/features/language-learning/web-ai";
import { useQuery } from "@/hooks/useQuery";
import {
    autoPracticeService, type PracticeArea, type PracticePlan, type PracticePlanInput, type PracticeQuantity,
} from "@/services/language-learning/autoPracticeService";

const difficulties = ["easy", "standard", "hard"] as const;
const blankQuantity: PracticeQuantity = { easy: 0, standard: 0, hard: 0 };
const inputClass = "rounded-lg border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-600";
const buttonClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600";

/** 領域別の選択と保存済みプランの状態を編集する。生成は予約後にサーバーが行う。 */
export function AutoPracticePlans() {
    const t = useTranslations("LanguageLearning.autoPractice");
    const owner = useSession().data?.user?.publicId;
    const areas = useTranslations("LanguageLearning.settings.webAi");
    const [editId, setEditId] = useState<string | undefined>();
    const [draft, setDraft] = useState<PracticePlanInput | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    const workspace = useQuery({
        keys: owner ? ["auto-practice-workspace", owner] as const : null,
        fetcher: autoPracticeService.workspace,
        config: { shouldRetryOnError: false },
    });

    /** 同時編集を検出できるように、編集の開始時点の revision を保持する。 */
    function edit(plan?: PracticePlan) {
        setEditId(plan?.id);
        setDraft(plan ? {
            name: plan.name, studyTime: plan.studyTime, enabled: plan.enabled, revision: plan.revision, areas: plan.areas,
        } : { name: "", studyTime: "18:00", enabled: false, areas: {} });
        setError(false);
    }

    /** 一つの入力だけを更新して、他のタイプの設定を保持する。 */
    function update(area: PracticeArea, difficulty: keyof PracticeQuantity, value: number) {
        setDraft((previous) => previous && ({
            ...previous,
            areas: {
                ...previous.areas,
                [area]: { ...(previous.areas[area] ?? blankQuantity), [difficulty]: value },
            },
        }));
    }

    /** 保存が完了した後で他プランの有効状態もサーバーから取得する。 */
    async function save(event: FormEvent) {
        event.preventDefault();
        if (draft == null || pending) return;
        setPending(true);
        setError(false);
        try {
            await autoPracticeService.savePlan(draft, editId);
            await workspace.mutate((current) => current, true);
            setDraft(null);
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }

    /** 削除の影響を伝え、サーバーで所有するプランだけを削除する。 */
    async function remove(plan: PracticePlan) {
        if (pending || !window.confirm(t("confirmDelete", { name: plan.name }))) return;
        setPending(true);
        setError(false);
        try {
            await autoPracticeService.deletePlan(plan.id);
            await workspace.mutate((current) => current, true);
            if (plan.id === editId) setDraft(null);
        } catch {
            setError(true);
        } finally {
            setPending(false);
        }
    }

    const data = workspace.data;
    const included = Object.entries(draft?.areas ?? {}).map(([area, quantity]) => ({
        area: area as PracticeArea, total: quantity.easy + quantity.standard + quantity.hard,
    }));
    const writingCount = included.filter(({ area }) => area.startsWith("WRITING_"))
        .reduce((total, current) => total + current.total, 0);
    const overLimit = data != null && (writingCount > data.writingLimit ||
        included.some(({ area, total }) => total > data.limits[area]));
    const unavailable = included.some(({ area, total }) => total > 0 && !data?.availableAreas.includes(area));
    const canSave = draft != null && draft.name.trim().length > 0 &&
        included.some(({ total }) => total > 0) && !overLimit && !unavailable;

    return (
        <section id="automatic-practice" className="space-y-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold">{t("title")}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t("description")}</p>
                </div>
                {data && <button className={buttonClass} type="button" disabled={pending} onClick={() => edit()}>
                    {t("newPlan")}
                </button>}
            </div>
            {workspace.isLoading && <p role="status" className="text-sm">{t("loading")}</p>}
            {(workspace.isError || error) && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">
                {t("error")}
            </p>}
            {data && <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {data.plans.map((plan) => <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-300">
                            {plan.studyTime} · {plan.learningLanguage} · {plan.enabled
                                ? t("active") : plan.pauseReason === "INACTIVITY" ? t("inactiveReason") : t("inactive")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" disabled={pending} className={buttonClass} onClick={() => edit(plan)}>
                            {t("edit")}
                        </button>
                        <button type="button" disabled={pending} className={buttonClass} onClick={() => void remove(plan)}>
                            {t("delete")}
                        </button>
                    </div>
                </li>)}
            </ul>}
            {draft && data && <form onSubmit={save} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr,10rem]">
                    <label className="grid gap-1 text-sm">{t("name")}
                        <input className={inputClass} required maxLength={100} value={draft.name}
                            onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                    </label>
                    <label className="grid gap-1 text-sm">{t("time")}
                        <input className={inputClass} required type="time" value={draft.studyTime}
                            onChange={(event) => setDraft({ ...draft, studyTime: event.target.value })} />
                        <span className="text-slate-500">{data.timezone}</span>
                    </label>
                </div>
                {WEB_AI_AREA_GROUPS.filter((group) => group.areas.some((area) => data.availableAreas.includes(area)))
                    .map((group) => <fieldset key={group.domain} className="space-y-2 rounded-xl border p-3">
                    <legend className="px-1 font-semibold">{areas(`domains.${group.domain}`)}</legend>
                    {group.areas.map((area) => <div key={area} className="grid gap-2 sm:grid-cols-[1fr,repeat(3,4.5rem)]">
                        <span className="text-sm">{areas(`areas.${area}`)} · {data.availableAreas.includes(area)
                            ? data.limits[area] : t("areaUnavailable")}</span>
                        {difficulties.map((difficulty) => <label className="grid text-xs" key={difficulty}>
                            {t(difficulty)}
                            <input
                                type="number" min={0} max={data.limits[area]} step={1} className={inputClass}
                                disabled={!data.availableAreas.includes(area)}
                                value={draft.areas[area]?.[difficulty] ?? 0}
                                aria-label={`${areas(`areas.${area}`)} ${t(difficulty)}`}
                                onChange={(event) => update(area, difficulty, event.target.valueAsNumber || 0)}
                            />
                        </label>)}
                    </div>)}
                </fieldset>)}
                {overLimit && <p role="alert" className="text-sm text-rose-600">{t("overLimit")}</p>}
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.enabled}
                        onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
                    {t("activate")}
                </label>
                <div className="flex gap-2">
                    <button className={buttonClass} type="submit" disabled={pending || !canSave}>{t("save")}</button>
                    <button className={buttonClass} type="button" disabled={pending} onClick={() => setDraft(null)}>
                        {t("cancel")}
                    </button>
                </div>
            </form>}
        </section>
    );
}
