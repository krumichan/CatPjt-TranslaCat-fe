import { useId } from "react";
import { useTranslations } from "next-intl";
import type { SpendingAnalysisInputs } from "@/utils/account-book/spendingAnalysis";

type Inputs = SpendingAnalysisInputs;
type Props = { inputs: Inputs; valid: boolean; onChange: (next: Partial<Inputs>) => void };

export default function SpendingAnalysisPeriodControls({ inputs, valid, onChange }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const inputId = useId();
    return (
        <div className="flex min-w-0 flex-wrap items-end gap-3">
            <div role="group" aria-label={t("periodLabel")} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                {(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"] as const).map(type => (
                    <button key={type} type="button" aria-pressed={inputs.periodType === type}
                        onClick={() => onChange({ periodType: type })}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${inputs.periodType === type ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-300"}`}>
                        {t({ MONTHLY: "monthly", QUARTERLY: "quarterly", HALF_YEARLY: "halfYearly", YEARLY: "yearly", CUSTOM: "custom" }[type])}
                    </button>
                ))}
            </div>
            {inputs.periodType !== "CUSTOM" && <label htmlFor={inputId} className="flex min-w-0 basis-full flex-col gap-1 text-xs text-slate-500 sm:min-w-44 sm:flex-1 sm:basis-auto dark:text-slate-400">
                {t(inputs.periodType === "MONTHLY" ? "monthLabel" : "yearLabel")}
                <input id={inputId} type={inputs.periodType === "MONTHLY" ? "month" : "text"} inputMode={inputs.periodType !== "MONTHLY" ? "numeric" : undefined}
                    value={inputs.periodType === "MONTHLY" ? inputs.monthValue : inputs.yearValue}
                    onChange={event => onChange(inputs.periodType === "MONTHLY" ? { monthValue: event.target.value } : { yearValue: event.target.value })}
                    aria-invalid={!valid} data-testid="spending-analysis-period-input"
                    className="min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-white/10 dark:bg-zinc-950 dark:text-white" />
            </label>}
            {inputs.periodType === "QUARTERLY" && <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">{t("quarterLabel")}
                <select value={inputs.quarterValue} onChange={event => onChange({ quarterValue: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                    {[1, 2, 3, 4].map(value => <option key={value} value={value}>{t("quarterOption", { number: value })}</option>)}
                </select>
            </label>}
            {inputs.periodType === "HALF_YEARLY" && <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">{t("halfLabel")}
                <select value={inputs.halfValue} onChange={event => onChange({ halfValue: event.target.value })} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base dark:border-white/10 dark:bg-zinc-950 dark:text-white">
                    <option value="1">{t("firstHalf")}</option><option value="2">{t("secondHalf")}</option>
                </select>
            </label>}
            {inputs.periodType === "CUSTOM" && <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">{t("startLabel")}
                    <input type="date" value={inputs.startValue} onChange={event => onChange({ startValue: event.target.value })} aria-invalid={!valid} className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base dark:border-white/10 dark:bg-zinc-950 dark:text-white" />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">{t("endLabel")}
                    <input type="date" value={inputs.endValue} onChange={event => onChange({ endValue: event.target.value })} aria-invalid={!valid} className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base dark:border-white/10 dark:bg-zinc-950 dark:text-white" />
                </label>
                <p className="text-xs text-slate-500 sm:col-span-2 dark:text-slate-400">{t("customMinimum")}</p>
            </div>}
        </div>
    );
}
