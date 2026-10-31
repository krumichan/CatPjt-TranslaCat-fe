import { useId } from "react";
import { useTranslations } from "next-intl";
import type { SpendingAnalysisPeriod } from "@/types/accountBookAnalysis";

type Inputs = { periodType: SpendingAnalysisPeriod["periodType"]; monthValue: string; yearValue: string };
type Props = { inputs: Inputs; valid: boolean; onChange: (next: Partial<Inputs>) => void };

export default function SpendingAnalysisPeriodControls({ inputs, valid, onChange }: Props) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const inputId = useId();
    return (
        <div className="flex min-w-0 flex-wrap items-end gap-3">
            <div role="group" aria-label={t("periodLabel")} className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                {(["MONTHLY", "YEARLY"] as const).map(type => (
                    <button key={type} type="button" aria-pressed={inputs.periodType === type}
                        onClick={() => onChange({ periodType: type })}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${inputs.periodType === type ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 dark:text-slate-300"}`}>
                        {t(type === "MONTHLY" ? "monthly" : "yearly")}
                    </button>
                ))}
            </div>
            <label htmlFor={inputId} className="flex min-w-0 basis-full flex-col gap-1 text-xs text-slate-500 sm:min-w-44 sm:flex-1 sm:basis-auto dark:text-slate-400">
                {t(inputs.periodType === "MONTHLY" ? "monthLabel" : "yearLabel")}
                <input id={inputId} type={inputs.periodType === "MONTHLY" ? "month" : "text"} inputMode={inputs.periodType === "YEARLY" ? "numeric" : undefined}
                    value={inputs.periodType === "MONTHLY" ? inputs.monthValue : inputs.yearValue}
                    onChange={event => onChange(inputs.periodType === "MONTHLY" ? { monthValue: event.target.value } : { yearValue: event.target.value })}
                    aria-invalid={!valid} data-testid="spending-analysis-period-input"
                    className="min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-white/10 dark:bg-zinc-950 dark:text-white" />
            </label>
        </div>
    );
}
