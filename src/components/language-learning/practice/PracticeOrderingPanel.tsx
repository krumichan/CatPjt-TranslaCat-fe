"use client";

import type { PracticeQuestion } from "@/types/language-learning/practice";
import { GripVertical, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export function PracticeOrderingPanel({ question, selection, editable, onToggle, onReset, t }: { question: PracticeQuestion; selection: string[]; editable: boolean; onToggle: (key: string) => void; onReset: () => void; t: ReturnType<typeof useTranslations> }) {
    const byKey = new Map(question.options.map((option) => [option.key, option]));
    const remaining = question.options.filter((option) => !selection.includes(option.key));
    return (
        <div className="mt-5 space-y-4">
            <div className="min-h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="mb-2 text-xs font-black text-slate-400">{t("session.ordering.yourOrder")}</p>
                {selection.length === 0 ? <p className="text-sm text-slate-400">{t("session.ordering.empty")}</p> : <div className="flex flex-wrap gap-2">{selection.map((key, idx) => <button key={`${key}-${idx}`} type="button" disabled={!editable} onClick={() => onToggle(key)} className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white"><span className="text-blue-200">{idx + 1}.</span>{byKey.get(key)?.text}</button>)}</div>}
            </div>
            <div>
                <p className="mb-2 text-xs font-black text-slate-400">{t("session.ordering.chunks")}</p>
                <div className="flex flex-wrap gap-2">{remaining.map((option) => <button key={option.key} type="button" disabled={!editable} onClick={() => onToggle(option.key)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"><GripVertical className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{option.text}</button>)}</div>
            </div>
            {editable && selection.length > 0 && <button type="button" onClick={onReset} className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{t("session.ordering.reset")}</button>}
        </div>
    );
}
