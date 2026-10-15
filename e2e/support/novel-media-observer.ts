import type { Page } from "@playwright/test";

interface MediaEventObservation {
    atMs: number;
    trusted: boolean;
    currentTime: number;
    duration: number;
    readyState: number;
    nativeElement: boolean;
}
interface NativeMediaObservation {
    nativePlay: boolean;
    clicks: { atMs: number; trusted: boolean; label: string }[];
    playing: MediaEventObservation[];
}
type ObservedWindow = Window & { __novelMediaObservation?: NativeMediaObservation; __novelObservedAudio?: HTMLMediaElement };

export async function installNativeMediaObserver(page: Page) {
    await page.addInitScript(() => {
        const observed = window as ObservedWindow;
        const nativePlay = HTMLMediaElement.prototype.play;
        const state: NativeMediaObservation = { nativePlay: Function.prototype.toString.call(nativePlay).includes("[native code]"), clicks: [], playing: [] };
        observed.__novelMediaObservation = state;
        // 실제 DOM click capture가 제품 handler보다 먼저 실행된다. 합성 클릭/playing 이벤트는 만들지 않는다.
        document.addEventListener("click", event => {
            const label = (event.target as Element | null)?.closest("button")?.textContent?.trim() ?? "";
            if (["원문 전체 읽기", "번역문 전체 읽기", "原文を全文再生", "翻訳を全文再生", "현재 회차 전체 읽기", "여기부터 읽기"].includes(label)
                || label.endsWith(": 이 문장 읽기")) {
                state.clicks.push({ atMs: performance.now(), trusted: event.isTrusted, label });
            }
        }, true);
        const media = new WeakSet<HTMLMediaElement>();
        // 원래 native play를 그대로 호출/반환한다. Audio 대체, autoplay 변경, event 주입, Promise 대체는 없다.
        HTMLMediaElement.prototype.play = function () {
            observed.__novelObservedAudio = this;
            if (!media.has(this)) {
                media.add(this);
                this.addEventListener("playing", event => state.playing.push({ atMs: performance.now(), trusted: event.isTrusted,
                    currentTime: this.currentTime, duration: this.duration, readyState: this.readyState, nativeElement: this instanceof HTMLAudioElement }));
            }
            return nativePlay.call(this);
        };
    });
}

export async function nativeMediaObservation(page: Page) {
    return page.evaluate(() => (window as ObservedWindow).__novelMediaObservation ?? null);
}

export async function nativePlaybackPosition(page: Page) {
    return page.evaluate(() => {
        const audio = (window as ObservedWindow).__novelObservedAudio;
        if (!audio) return null;
        return { observedAtMs: performance.now(), currentTime: audio.currentTime, duration: audio.duration,
            playbackRate: audio.playbackRate, paused: audio.paused, ended: audio.ended, nativeElement: audio instanceof HTMLAudioElement };
    });
}

export function nativeClickToPlaying(before: NativeMediaObservation | null, after: NativeMediaObservation | null) {
    const clicks = after?.clicks.slice(before?.clicks.length ?? 0) ?? [];
    const playing = after?.playing.slice(before?.playing.length ?? 0) ?? [];
    const click = clicks[0];
    const firstPlaying = playing[0];
    if (!after?.nativePlay || !click?.trusted || !firstPlaying?.trusted || !firstPlaying.nativeElement || firstPlaying.atMs < click.atMs) {
        throw new Error("NATIVE_CLICK_AND_PLAYING_REQUIRED");
    }
    return { origin: "native DOM click capture", endpoint: "native trusted HTMLAudioElement playing event",
        clickAtMs: click.atMs, playingAtMs: firstPlaying.atMs, clickToPlayingMs: firstPlaying.atMs - click.atMs,
        readClickCount: clicks.length, playingEventCount: playing.length, clicks, playing };
}
