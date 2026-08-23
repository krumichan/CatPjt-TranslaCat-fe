import { Pause, Play, Rabbit } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function ReferenceAudioPlayer({
    loading,
    playbackRate,
    onPlay,
}: {
    loading: boolean;
    playbackRate: number;
    onPlay: (audio: HTMLAudioElement, slow: boolean) => Promise<boolean>;
}) {
    const t = useTranslations("LanguageLearning.listening.session.audio");
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);

    const play = async (slow: boolean) => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
            return;
        }
        const ok = await onPlay(audioRef.current, slow);
        if (ok) setPlaying(true);
    };

    return (
        <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 dark:border-blue-400/15 dark:bg-blue-500/10" data-testid="listening-reference-audio">
            <audio
                ref={audioRef}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
                onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
            />
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void play(false)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:opacity-50">
                    {playing && playbackRate === 1 ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    {t("play")}
                </button>
                <button type="button" onClick={() => void play(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-400/20 dark:bg-white/5 dark:text-blue-200">
                    <Rabbit className="h-4 w-4" aria-hidden="true" />
                    {t("slow")}
                </button>
                <p className="text-xs font-bold text-blue-700/70 dark:text-blue-200/70" aria-live="polite">
                    {formatSeconds(current)} / {formatSeconds(duration)} · {playbackRate}x
                </p>
            </div>
            <p className="mt-3 text-xs text-blue-700/70 dark:text-blue-200/70">{t("notice")}</p>
        </section>
    );
}

function formatSeconds(value: number) {
    const total = Math.max(0, Math.floor(value));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
