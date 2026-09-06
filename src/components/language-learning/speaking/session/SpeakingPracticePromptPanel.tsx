"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, ListChecks, NotebookPen, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { AudioPlaybackButton } from "@/components/language-learning/speaking/common/AudioPlaybackButton";
import type { SpeakingSessionController } from "@/hooks/language-learning/speaking/useSpeakingSessionController";
import type { SpeakingPromptGuide } from "@/types/language-learning/speaking";

function emptyGuide(): SpeakingPromptGuide {
    return { scriptText: null, providedFacts: [], requiredIntents: [], responseConstraints: [] };
}

export function SpeakingPracticePromptPanel({ controller }: { controller: SpeakingSessionController }) {
    const t = useTranslations("LanguageLearning.speaking.session.practice");
    const detail = controller.detail!;
    const session = detail.session;
    const readAloudPromptTurn = useMemo(() => {
        if (session.practiceMode !== "READ_ALOUD" || controller.readAloudActiveProblemIndex <= 1) {
            return null;
        }
        return [...detail.turns].reverse().find((turn) =>
            turn.problemIndex === controller.readAloudActiveProblemIndex - 1 &&
            Boolean(turn.assistantText?.trim()),
        ) ?? null;
    }, [controller.readAloudActiveProblemIndex, detail.turns, session.practiceMode]);
    const latestPrompt = useMemo(() => {
        if (session.practiceMode === "READ_ALOUD") {
            if (readAloudPromptTurn) {
                return {
                    ...readAloudPromptTurn.promptGuide,
                    scriptText: readAloudPromptTurn.promptGuide?.scriptText?.trim()
                        ? readAloudPromptTurn.promptGuide.scriptText
                        : readAloudPromptTurn.assistantText,
                };
            }
            return session.openingPromptGuide ?? {
                ...emptyGuide(),
                scriptText: session.openingAssistantText,
            };
        }
        const latest = [...detail.turns].reverse().find((turn) => {
            const guide = turn.promptGuide;
            return Boolean(guide?.scriptText?.trim()) ||
                (guide?.providedFacts?.length ?? 0) > 0 ||
                (guide?.requiredIntents?.length ?? 0) > 0 ||
                (guide?.responseConstraints?.length ?? 0) > 0;
        });
        return latest?.promptGuide ?? session.openingPromptGuide ?? emptyGuide();
    }, [detail.turns, readAloudPromptTurn, session.openingAssistantText, session.openingPromptGuide, session.practiceMode]);
    const referenceAudioUrl = session.practiceMode === "READ_ALOUD"
        ? readAloudPromptTurn?.assistantAudioUrl ?? session.openingAssistantAudioUrl
        : null;

    const noteKey = `language-learning:speaking:note:${session.id}`;
    const [note, setNote] = useState("");
    const showNote = session.practiceMode === "GUIDED" || session.practiceMode === "FREE";

    useEffect(() => {
        if (!showNote) return;
        try {
            setNote(window.localStorage.getItem(noteKey) ?? "");
        } catch {
            setNote("");
        }
    }, [noteKey, showNote]);

    useEffect(() => {
        if (!showNote) return;
        const timer = window.setTimeout(() => {
            try {
                if (note.trim()) window.localStorage.setItem(noteKey, note);
                else window.localStorage.removeItem(noteKey);
            } catch {
                // Personal scratch notes are best-effort and never sent to the server.
            }
        }, 350);
        return () => window.clearTimeout(timer);
    }, [note, noteKey, showNote]);

    const hasGuide = Boolean(latestPrompt.scriptText?.trim()) ||
        latestPrompt.providedFacts.length > 0 ||
        latestPrompt.requiredIntents.length > 0 ||
        latestPrompt.responseConstraints.length > 0;

    if (!hasGuide && !showNote) return null;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75" data-testid="speaking-practice-prompt">
            <div className="flex items-center gap-2">
                {session.practiceMode === "READ_ALOUD" ? <Volume2 className="h-5 w-5 text-blue-600" aria-hidden="true" /> : <BookOpenText className="h-5 w-5 text-blue-600" aria-hidden="true" />}
                <h2 className="text-lg font-black text-slate-950 dark:text-white">{t(`mode.${session.practiceMode}`)}</h2>
            </div>

            {latestPrompt.scriptText && (
                <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-4 dark:bg-blue-500/10">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-500">{t("script")}</p>
                    <p className="mt-2 whitespace-pre-wrap text-base font-bold leading-7 text-slate-900 dark:text-white">{latestPrompt.scriptText}</p>
                    {session.practiceMode === "READ_ALOUD" && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <AudioPlaybackButton url={referenceAudioUrl} />
                            <AudioPlaybackButton url={referenceAudioUrl} slow />
                        </div>
                    )}
                </div>
            )}

            {(latestPrompt.providedFacts.length > 0 || latestPrompt.requiredIntents.length > 0 || latestPrompt.responseConstraints.length > 0) && (
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <GuideList title={t("providedFacts")} values={latestPrompt.providedFacts} />
                    <GuideList title={t("requiredIntents")} values={latestPrompt.requiredIntents} />
                    <GuideList title={t("responseConstraints")} values={latestPrompt.responseConstraints} />
                </div>
            )}

            {showNote && (
                <label className="mt-5 block">
                    <span className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
                        <NotebookPen className="h-4 w-4 text-blue-600" aria-hidden="true" />
                        {t("noteTitle")}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{t("noteHelp")}</span>
                    <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={4}
                        maxLength={3000}
                        placeholder={t("notePlaceholder")}
                        className="mt-3 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:ring-blue-500/20"
                    />
                    <span className="mt-1 block text-[11px] font-bold text-slate-400">{t("noteSaved")}</span>
                </label>
            )}
        </section>
    );
}

function GuideList({ title, values }: { title: string; values: string[] }) {
    if (values.length === 0) return null;
    return (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
            <p className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-300">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                {title}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {values.map((value, index) => <li key={`${index}-${value}`}>• {value}</li>)}
            </ul>
        </div>
    );
}
