import {
    Languages,
    Lightbulb,
    LoaderCircle,
    MessageSquareQuote,
    RotateCcw,
    Snail,
    Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AudioPlaybackButton } from "@/components/language-learning/speaking/common/AudioPlaybackButton";
import { cn } from "@/lib/utils";
import type {
    AssistanceType,
    SpeakingAssistanceResponse,
} from "@/types/language-learning/speaking";

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
    usage,
    results,
    loadingType,
    hasAssistantPrompt,
    error,
    onRequest,
}: {
    usage: AssistanceType[];
    results: Partial<Record<AssistanceType, SpeakingAssistanceResponse>>;
    loadingType: AssistanceType | null;
    hasAssistantPrompt: boolean;
    error: boolean;
    onRequest: (type: AssistanceType) => Promise<unknown>;
}) {
    const t = useTranslations("LanguageLearning.speaking.session.assistance");
    const usageCount = (type: AssistanceType) =>
        usage.filter((item) => item === type).length;

    return (
        <section
            data-testid="speaking-assistance-panel"
            className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-slate-900/75"
        >
            <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    {t("title")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t("description")}
                </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ASSISTANCE_ITEMS.map(({ type, icon: Icon }) => {
                    const count = usageCount(type);
                    const loading = loadingType === type;
                    return (
                        <button
                            key={type}
                            type="button"
                            disabled={!hasAssistantPrompt || loadingType !== null}
                            onClick={() => void onRequest(type)}
                            className={cn(
                                "flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black transition",
                                "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40",
                                "dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-blue-500/10",
                            )}
                        >
                            {loading ? (
                                <LoaderCircle
                                    className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Icon
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                            )}
                            <span className="min-w-0 flex-1">
                                {t(`items.${type}`)}
                            </span>
                            {count > 0 && (
                                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {!hasAssistantPrompt && (
                <p className="mt-3 text-xs leading-5 text-slate-400">
                    {t("unavailableUntilQuestion")}
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
                >
                    {t("loadFailed")}
                </p>
            )}

            <AssistanceResult
                result={results.SHOW_QUESTION}
                title={t("question")}
            />
            <AssistanceResult result={results.HINT} title={t("hint")} />
            <AssistanceResult
                result={results.TRANSLATION}
                title={t("translation")}
            />
            <AssistanceResult
                result={results.SAMPLE_ANSWER}
                title={t("sampleAnswer")}
            />

            {(results.REPLAY || results.SLOW_PLAYBACK) && (
                <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
                    {results.REPLAY && (
                        <AudioPlaybackButton
                            url={results.REPLAY.audioUrl}
                            playbackRate={results.REPLAY.playbackRate}
                            compact
                        />
                    )}
                    {results.SLOW_PLAYBACK && (
                        <AudioPlaybackButton
                            url={results.SLOW_PLAYBACK.audioUrl}
                            playbackRate={results.SLOW_PLAYBACK.playbackRate}
                            slow
                            compact
                        />
                    )}
                </div>
            )}

            {usage.length > 0 && (
                <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                    {t("used", { count: usage.length })}
                </p>
            )}
        </section>
    );
}

function AssistanceResult({
    result,
    title,
}: {
    result: SpeakingAssistanceResponse | undefined;
    title: string;
}) {
    if (!result?.content) return null;

    return (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {title}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{result.content}</p>
        </div>
    );
}
