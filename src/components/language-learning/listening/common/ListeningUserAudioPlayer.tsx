"use client";

import { useEffect, useState } from "react";

import { listeningService } from "@/services/language-learning/listeningService";

interface ListeningUserAudioPlayerProps {
    taskResponseId: number;
    available: boolean;
    expired: boolean;
    loadLabel: string;
    loadingLabel: string;
    errorLabel: string;
}

export function ListeningUserAudioPlayer({
    taskResponseId,
    available,
    expired,
    loadLabel,
    loadingLabel,
    errorLabel,
}: ListeningUserAudioPlayerProps) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(
        () => () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        },
        [audioUrl],
    );

    if (!available || expired) return null;

    const load = async () => {
        if (audioUrl || loading) return;
        setLoading(true);
        setFailed(false);
        try {
            const blob = await listeningService.fetchUserAudio(taskResponseId);
            setAudioUrl(URL.createObjectURL(blob));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-3">
            {audioUrl ? (
                <audio
                    controls
                    src={audioUrl}
                    className="w-full"
                    aria-label={loadLabel}
                    data-testid={`listening-user-audio-${taskResponseId}`}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                    {loading ? loadingLabel : loadLabel}
                </button>
            )}
            {failed && (
                <p role="alert" className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">
                    {errorLabel}
                </p>
            )}
        </div>
    );
}
