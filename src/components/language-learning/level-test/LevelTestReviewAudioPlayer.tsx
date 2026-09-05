"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Volume2 } from "lucide-react";

import { languageLearningLevelService } from "@/services/language-learning/languageLearningLevelService";

type ReviewAudioKind = "reference" | "answer" | "modelAnswer";

interface LevelTestReviewAudioPlayerProps {
    itemId: number;
    kind: ReviewAudioKind;
    loadLabel: string;
    errorLabel: string;
}

export function LevelTestReviewAudioPlayer({
    itemId,
    kind,
    loadLabel,
    errorLabel,
}: LevelTestReviewAudioPlayerProps) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const load = async () => {
        if (audioUrl || loading) return;
        setLoading(true);
        setFailed(false);
        try {
            const blob = kind === "reference"
                ? await languageLearningLevelService.fetchReferenceAudio(itemId)
                : kind === "answer"
                    ? await languageLearningLevelService.fetchAnswerAudio(itemId)
                    : await languageLearningLevelService.fetchModelAnswerAudio(itemId);
            setAudioUrl(URL.createObjectURL(blob));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    if (audioUrl) {
        return (
            <audio
                controls
                preload="metadata"
                src={audioUrl}
                className="mt-2 w-full"
                data-testid={`level-test-review-audio-${kind}-${itemId}`}
            />
        );
    }

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-white/5"
            >
                {loading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                )}
                {loadLabel}
            </button>
            {failed && (
                <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">
                    {errorLabel}
                </p>
            )}
        </div>
    );
}
