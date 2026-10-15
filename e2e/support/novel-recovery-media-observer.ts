import type { Page } from "@playwright/test";

interface MediaEventObservation {
    atMs: number;
    trusted: boolean;
    currentTime: number;
    duration: number;
    readyState: number;
    nativeElement: boolean;
    segmentId: string | null;
    phase: string;
}
export interface AudioRequestObservation {
    atMs: number;
    phase: string;
    revision: string;
    segmentId: string;
    language: string;
    partIndex: number;
    readIntent: { mode: "single" | "from" | "all"; segmentId: string | null } | null;
    activeSegmentId: string | null;
    playbackState: string | null;
    lastEndedSegmentId: string | null;
    nativePosition: { currentTime: number; duration: number; paused: boolean; ended: boolean; playbackRate: number } | null;
}
interface NativeMediaObservation {
    documentId: string;
    nativePlay: boolean;
    clicks: { atMs: number; trusted: boolean; label: string }[];
    playing: MediaEventObservation[];
    ended: MediaEventObservation[];
    audioRequests: AudioRequestObservation[];
    phase: string;
    readIntent: AudioRequestObservation["readIntent"];
}
type ObservedWindow = Window & { __novelMediaObservation?: NativeMediaObservation; __novelObservedAudio?: HTMLMediaElement };

export async function installNativeMediaObserver(page: Page) {
    await page.addInitScript(() => {
        const observed = window as ObservedWindow;
        const nativePlay = HTMLMediaElement.prototype.play;
        const nativeFetch = window.fetch;
        const state: NativeMediaObservation = { documentId: crypto.randomUUID(), nativePlay: Function.prototype.toString.call(nativePlay).includes("[native code]"),
            clicks: [], playing: [], ended: [], audioRequests: [], phase: "entry", readIntent: null };
        observed.__novelMediaObservation = state;
        const activeSegmentId = () => document.querySelector('[data-testid="novel-sentence"][data-active="true"]')?.getAttribute("data-segment-id") ?? null;
        // 실제 DOM click capture가 제품 handler보다 먼저 실행된다. 합성 클릭/playing 이벤트는 만들지 않는다.
        document.addEventListener("click", event => {
            const label = (event.target as Element | null)?.closest("button")?.textContent?.trim() ?? "";
            const wholeRead = ["원문 전체 읽기", "번역문 전체 읽기", "原文を全文再生", "翻訳を全文再生", "현재 회차 전체 읽기"].includes(label);
            if (wholeRead || label === "여기부터 읽기" || label.endsWith(": 이 문장 읽기")) {
                state.clicks.push({ atMs: performance.now(), trusted: event.isTrusted, label });
                state.readIntent = { mode: wholeRead ? "all" : label === "여기부터 읽기" ? "from" : "single",
                    segmentId: wholeRead
                        ? document.querySelector('[data-testid="novel-sentence"]')?.getAttribute("data-segment-id") ?? null
                        : (event.target as Element | null)?.closest('[data-testid="novel-sentence"]')?.getAttribute("data-segment-id") ?? null };
            }
        }, true);
        // 실제 fetch 호출 직전 같은 document clock과 재생 위치만 기록한다. URL/본문/응답/abort 동작은 바꾸지 않는다.
        window.fetch = function (input, init) {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (new URL(url, location.href).pathname.endsWith("/audio") && typeof init?.body === "string") {
                try {
                    const body = JSON.parse(init.body);
                    const audio = observed.__novelObservedAudio;
                    state.audioRequests.push({ atMs: performance.now(), phase: state.phase,
                        revision: body.revision, segmentId: body.segmentId, language: body.language, partIndex: body.partIndex,
                        readIntent: state.readIntent ? { ...state.readIntent } : null,
                        activeSegmentId: activeSegmentId(), playbackState: document.querySelector('[data-testid="novel-playback-state"]')?.getAttribute("data-state") ?? null,
                        lastEndedSegmentId: state.ended.findLast(item => item.phase === state.phase)?.segmentId ?? null,
                        nativePosition: audio ? { currentTime: audio.currentTime, duration: audio.duration, paused: audio.paused, ended: audio.ended, playbackRate: audio.playbackRate } : null });
                } catch { /* 잘못된 요청도 원래 fetch가 그대로 처리한다. Node 측 요청 수와 대조해 누락을 실패 처리한다. */ }
            }
            return nativeFetch.call(this, input, init);
        };
        const media = new WeakSet<HTMLMediaElement>();
        // 원래 native play를 그대로 호출/반환한다. Audio 대체, autoplay 변경, event 주입, Promise 대체는 없다.
        HTMLMediaElement.prototype.play = function () {
            observed.__novelObservedAudio = this;
            if (!media.has(this)) {
                media.add(this);
                this.addEventListener("playing", event => state.playing.push({ atMs: performance.now(), trusted: event.isTrusted,
                    currentTime: this.currentTime, duration: this.duration, readyState: this.readyState, nativeElement: this instanceof HTMLAudioElement,
                    segmentId: activeSegmentId(), phase: state.phase }));
                this.addEventListener("ended", event => state.ended.push({ atMs: performance.now(), trusted: event.isTrusted,
                    currentTime: this.currentTime, duration: this.duration, readyState: this.readyState, nativeElement: this instanceof HTMLAudioElement,
                    segmentId: activeSegmentId(), phase: state.phase }), true);
            }
            return nativePlay.call(this);
        };
    });
}

export async function setNativeMediaPhase(page: Page, phase: string) {
    await page.evaluate(value => {
        const state = (window as ObservedWindow).__novelMediaObservation;
        if (!state) throw new Error("NATIVE_OBSERVER_REQUIRED");
        state.phase = value;
    }, phase);
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
