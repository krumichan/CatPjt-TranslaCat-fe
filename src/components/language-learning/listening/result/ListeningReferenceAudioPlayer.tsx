"use client";

import { Headphones, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { listeningService } from "@/services/language-learning/listeningService";

export function ListeningReferenceAudioPlayer({ itemId }: { itemId: number }) {
    const t = useTranslations("LanguageLearning.listening.result");
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => () => {
        if (url) URL.revokeObjectURL(url);
    }, [url]);

    const load = async () => {
        if (url || loading) return;
        setLoading(true);
        setFailed(false);
        try {
            const blob = await listeningService.fetchReferenceAudio(itemId);
            setUrl(URL.createObjectURL(blob));
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-400/15 dark:bg-blue-500/10" data-testid={`listening-result-reference-audio-${itemId}`}>
            <div className="flex flex-wrap items-center gap-3">
                <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                <p className="text-sm font-black text-blue-900 dark:text-blue-100">{t("referenceAudioTitle")}</p>
                {!url && (
                    <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-50">
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        {loading ? t("referenceAudioLoading") : t("referenceAudioPlay")}
                    </button>
                )}
            </div>
            {url && <audio controls preload="none" src={url} className="mt-3 w-full" />}
            {failed && <p role="alert" className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">{t("referenceAudioFailed")}</p>}
        </div>
    );
}
