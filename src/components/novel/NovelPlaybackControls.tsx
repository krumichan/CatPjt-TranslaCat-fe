"use client";

import { readerLabels } from "@/features/novel/readerLabels";
import type { NovelReadAloud } from "@/hooks/novel/useNovelReadAloud";

export default function NovelPlaybackControls({ audio, locale, translated }: { audio: NovelReadAloud; locale: string; translated: boolean }) {
    const labels = readerLabels(locale);
    return <section aria-label={labels.all} className="border rounded-xl p-3 space-y-3 bg-white dark:bg-zinc-900 text-sm">
        <div className="flex flex-wrap items-center gap-3">
            <label>{labels.language} <select value={audio.language} onChange={event => audio.setLanguage(event.target.value as "ja" | "ko")}>
                <option value="ko">{labels.translation}</option><option value="ja">{labels.source}</option>
            </select></label>
            <button type="button" disabled={audio.language === "ko" && !translated} onClick={() => audio.read("all")}>{labels.all}</button>
            {["playing", "loading", "waiting"].includes(audio.status) && <button type="button" onClick={audio.pause}>{labels.pause}</button>}
            {audio.status === "paused" && <button type="button" onClick={audio.resume}>{labels.resume}</button>}
            <button type="button" onClick={audio.stop} disabled={audio.status === "idle"}>{labels.stop}</button>
            <button type="button" onClick={() => audio.skip(-1)} disabled={!audio.count || audio.index === 0}>{labels.previous}</button>
            <button type="button" onClick={() => audio.skip(1)} disabled={!audio.count || audio.index >= audio.count - 1}>{labels.next}</button>
            <label>{labels.speed} <select value={audio.rate} onChange={event => audio.setRate(Number(event.target.value))}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate}>{rate}×</option>)}
            </select></label>
            <label><input type="checkbox" checked={audio.follow} onChange={event => audio.setFollow(event.target.checked)} /> {labels.follow}</label>
        </div>
        <p className="text-xs text-zinc-500">{labels.disclosure}</p>
        <p role="status" data-testid="novel-playback-state" data-state={audio.status}
            data-first-audio-playable-ms={audio.firstAudioPlayableMs ?? undefined} data-first-audio-playing-ms={audio.firstAudioPlayingMs ?? undefined}
            data-first-audio-response-ms={audio.firstAudioResponseMs ?? undefined} data-first-audio-decode-ms={audio.firstAudioDecodeMs ?? undefined}
            data-first-audio-headers-ms={audio.firstAudioHeadersMs ?? undefined}
            data-first-audio-cache-hit={audio.firstAudioCacheHit ?? undefined} data-audio-gaps-ms={JSON.stringify(audio.gapsMs)}>
            {audio.status === "loading" ? labels.preparing : audio.status === "playing" ? labels.playing : audio.status === "paused" ? labels.paused
                : audio.status === "waiting" ? labels.waitingTranslation : audio.status === "ended" ? labels.ended : ""}
        </p>
        {audio.error && <div role="alert">{labels.audioError} <button type="button" onClick={audio.retry}>{labels.retry}</button></div>}
    </section>;
}
