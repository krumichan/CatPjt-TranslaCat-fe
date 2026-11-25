"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LEVEL_SELF_SELECTION_OPTIONS } from "@/features/language-learning/level-test/selfSelection";
import type { LevelSelfSelectionBand } from "@/types/language-learning/level";

interface LevelTestSelfSelectionCardProps {
    disabled: boolean;
    onSelect: (band: LevelSelfSelectionBand) => Promise<boolean>;
}

/** 初回だけB1〜B3を明示的に選び、実測ではない初期得点で学習を開始する。 */
export function LevelTestSelfSelectionCard({ disabled, onSelect }: LevelTestSelfSelectionCardProps) {
    const t = useTranslations("LanguageLearning.levelTest");
    const [selected, setSelected] = useState<LevelSelfSelectionBand | null>(null);

    return (
        <section className="rounded-3xl border border-blue-200 bg-white/90 p-6 shadow-sm dark:border-blue-500/20 dark:bg-slate-900/75 sm:p-8">
            <fieldset disabled={disabled} aria-busy={disabled} className="space-y-4">
                <legend className="text-xl font-black text-slate-950 dark:text-white">{t("selfSelection.title")}</legend>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{t("selfSelection.description")}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                    {LEVEL_SELF_SELECTION_OPTIONS.map((option) => (
                        <label key={option.band} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 dark:border-white/10 dark:has-[:checked]:bg-blue-500/10">
                            <input
                                type="radio"
                                name="level-self-selection"
                                value={option.band}
                                checked={selected === option.band}
                                onChange={() => setSelected(option.band)}
                                className="h-4 w-4 accent-blue-600"
                            />
                            <span>
                                <span className="block font-black text-slate-950 dark:text-white">{option.band} · {t(`band.${option.proficiencyBand}`)}</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400">{t("selfSelection.score", { score: option.score })}</span>
                            </span>
                        </label>
                    ))}
                </div>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t("selfSelection.notice")}</p>
                <button
                    type="button"
                    disabled={disabled || selected === null}
                    onClick={() => { if (selected) void onSelect(selected); }}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {disabled ? t("selfSelection.saving") : t("selfSelection.confirm")}
                </button>
            </fieldset>
        </section>
    );
}
