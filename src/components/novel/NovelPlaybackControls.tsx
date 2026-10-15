"use client";

import { Headphones, Pause, Play, Square, Volume2 } from "lucide-react";
import { readerLabels } from "@/features/novel/readerLabels";
import type { NovelReadAloud } from "@/hooks/novel/useNovelReadAloud";

interface Props {
    audio: NovelReadAloud;
    locale: string;
    translated: boolean;
}

export default function NovelPlaybackControls({ audio, locale, translated }: Props) {
    const labels = readerLabels(locale);
    const active = ["loading", "playing", "paused", "waiting"].includes(audio.status);
    const status = audio.status === "loading" ? labels.preparing : audio.status === "playing" ? labels.playing
        : audio.status === "paused" ? labels.paused : audio.status === "waiting" ? labels.waitingTranslation
            : audio.status === "ended" ? labels.ended : labels.audioIdle;

    return <section aria-label={labels.audioSection} data-testid="novel-playback-controls"
        className="rounded-2xl bg-indigo-50/80 p-2 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Headphones size={18} aria-hidden="true" className="text-indigo-600 dark:text-indigo-300" />
            <span>{labels.audioSection}</span>
        </div>

        {/* 명시적인 전체 읽기만 합성을 시작한다. 언어별 버튼으로 재생 범위를 분명히 표시한다. */}
        <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={active && audio.language === "ja"}
                onClick={() => audio.read("all", undefined, "ja")}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-2 py-2 text-sm font-bold text-white shadow-md hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                <Volume2 size={18} aria-hidden="true" /> {labels.sourceAll}
            </button>
            <button type="button" aria-pressed={active && audio.language === "ko"} disabled={!translated}
                onClick={() => audio.read("all", undefined, "ko")}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-2 py-2 text-sm font-bold text-zinc-950 shadow-md hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-40">
                <Volume2 size={18} aria-hidden="true" /> {labels.translationAll}
            </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {["playing", "loading", "waiting"].includes(audio.status) && <button type="button" onClick={audio.pause}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-300 px-2.5 hover:bg-white dark:border-zinc-600 dark:hover:bg-zinc-700">
                <Pause size={15} aria-hidden="true" /> {labels.pause}
            </button>}
            {audio.status === "paused" && <button type="button" onClick={audio.resume}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-300 px-2.5 hover:bg-white dark:border-zinc-600 dark:hover:bg-zinc-700">
                <Play size={15} aria-hidden="true" /> {labels.resume}
            </button>}
            <button type="button" onClick={audio.stop} disabled={audio.status === "idle"}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-300 px-2.5 hover:bg-white disabled:opacity-40 dark:border-zinc-600 dark:hover:bg-zinc-700">
                <Square size={14} aria-hidden="true" /> {labels.stop}
            </button>
            <label className="ml-auto inline-flex items-center gap-1">{labels.speed}
                <select value={audio.rate} onChange={event => audio.setRate(Number(event.target.value))}
                    className="rounded border border-zinc-300 bg-white px-1 py-1.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate}>{rate}×</option>)}
                </select>
            </label>
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={audio.follow}
                onChange={event => audio.setFollow(event.target.checked)} /> {labels.follow}</label>
        </div>

        <p role="status" data-testid="novel-playback-state" data-state={audio.status}
            data-first-audio-playable-ms={audio.firstAudioPlayableMs ?? undefined} data-first-audio-playing-ms={audio.firstAudioPlayingMs ?? undefined}
            data-first-audio-response-ms={audio.firstAudioResponseMs ?? undefined} data-first-audio-decode-ms={audio.firstAudioDecodeMs ?? undefined}
            data-first-audio-headers-ms={audio.firstAudioHeadersMs ?? undefined}
            data-first-audio-cache-hit={audio.firstAudioCacheHit ?? undefined} data-audio-gaps-ms={JSON.stringify(audio.gapsMs)}
            className="mt-1 text-xs text-indigo-700 dark:text-indigo-200">{status}</p>
        <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">{labels.disclosure}</p>
        {audio.error && <div role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{labels.audioError} <button type="button" onClick={audio.retry} className="underline">{labels.retry}</button></div>}
    </section>;
}
