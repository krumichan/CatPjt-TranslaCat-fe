import {
    Languages,
    Lightbulb,
    MessageSquareQuote,
    RotateCcw,
    Snail,
    Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AudioPlaybackButton } from "@/components/language-learning/speaking/common/AudioPlaybackButton";
import { cn } from "@/lib/utils";
import type { AssistanceType, SpeakingTurn } from "@/types/language-learning/speaking";

const ASSISTANCE_ITEMS: Array<{
    type: AssistanceType;
    icon: typeof Volume2;
}> = [
    { type: "REPLAY", icon: Volume2 },
    { type: "SLOW_PLAYBACK", icon: Snail },
    { type: "SHOW_QUESTION", icon: RotateCcw },
    { type: "HINT", icon: Lightbulb },
    { type: "TRANSLATION", icon: Languages },
    { type: "SAMPLE_ANSWER", icon: MessageSquareQuote },
];

export function SpeakingAssistancePanel({
    selected,
    latestTurn,
    onToggle,
}: {
    selected: AssistanceType[];
    latestTurn: SpeakingTurn | null;
    onToggle: (type: AssistanceType) => void;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.assistance");

    return (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/75">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white">
                        {t("title")}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ASSISTANCE_ITEMS.map(({ type, icon: Icon }) => {
                    const active = selected.includes(type);
                    const disabled =
                        (type === "REPLAY" ||
                            type === "SLOW_PLAYBACK" ||
                            type === "SHOW_QUESTION") &&
                        !latestTurn?.assistantText;
                    return (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={active}
                            disabled={disabled}
                            onClick={() => onToggle(type)}
                            className={cn(
                                "flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black transition",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40",
                                active
                                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {t(`items.${type}`)}
                        </button>
                    );
                })}
            </div>
            {selected.includes("SHOW_QUESTION") && latestTurn?.assistantText && (
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t("question")}</p>
                    <p className="mt-1">{latestTurn.assistantText}</p>
                </div>
            )}
            {(selected.includes("REPLAY") || selected.includes("SLOW_PLAYBACK")) && latestTurn && (
                <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
                    {selected.includes("REPLAY") && <AudioPlaybackButton url={latestTurn.assistantAudioUrl} compact />}
                    {selected.includes("SLOW_PLAYBACK") && <AudioPlaybackButton url={latestTurn.assistantAudioUrl} slow compact />}
                </div>
            )}
            {selected.length > 0 && (
                <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                    {t("selected", { count: selected.length })}
                </p>
            )}
        </section>
    );
}
