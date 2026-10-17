import type { NovelAudioPart, NovelLanguage, NovelSegment } from "@/types/novel/reader";
import { novelTranslation } from "@/features/novel/translationLanguage";

export interface PlaybackState {
    status: "idle" | "loading" | "playing" | "paused" | "waiting" | "error" | "ended";
    segmentId: string | null;
    index: number;
    count: number;
    error: string | null;
    firstAudioPlayableMs: number | null;
    firstAudioPlayingMs: number | null;
    firstAudioResponseMs: number | null;
    firstAudioHeadersMs: number | null;
    firstAudioDecodeMs: number | null;
    firstAudioCacheHit: boolean | null;
    gapsMs: number[];
}

interface Dependencies {
    fetchAudio: (segmentId: string, language: NovelLanguage, partIndex: number, signal: AbortSignal) => Promise<NovelAudioPart>;
    createAudio: (url: string) => HTMLAudioElement;
    createUrl: (blob: Blob) => string;
    revokeUrl: (url: string) => void;
    now: () => number;
    onChange: (state: PlaybackState) => void;
}

export const initialPlayback: PlaybackState = {
    status: "idle", segmentId: null, index: 0, count: 0, error: null,
    firstAudioPlayableMs: null, firstAudioPlayingMs: null, firstAudioResponseMs: null, firstAudioHeadersMs: null,
    firstAudioDecodeMs: null, firstAudioCacheHit: null, gapsMs: [],
};
const CACHE_TTL_MS = 60_000;
const CACHE_BYTES = 8 * 1024 * 1024;
type Position = { index: number; part: number };

function audioKey(segment: NovelSegment, language: NovelLanguage, part: number) {
    return JSON.stringify([segment.id, language, language === "ja" ? segment.plainJa : novelTranslation(segment, language), part]);
}

export class NovelPlayback {
    private generation = 0;
    private audio: HTMLAudioElement | null = null;
    private url: string | null = null;
    private queue: NovelSegment[] = [];
    private language: NovelLanguage = "ko";
    private index = 0;
    private part = 0;
    private rate = 1;
    private started = 0;
    private endedAt: number | null = null;
    private intent = false;
    private awaitingMore = false;
    private identity = "";
    private lookaheadAttempted: string | null = null;
    private state = { ...initialPlayback };
    private cache = new Map<string, { value: NovelAudioPart; expires: number }>();
    private pending = new Map<string, { controller: AbortController; promise: Promise<NovelAudioPart> }>();
    private failedLookahead = new Set<string>();

    constructor(private dependencies: Dependencies) {}

    private emit(change: Partial<PlaybackState>) {
        this.state = { ...this.state, ...change };
        this.dependencies.onChange({ ...this.state, gapsMs: [...this.state.gapsMs] });
    }

    private key(position: Position) {
        const segment = this.queue[position.index];
        return audioKey(segment, this.language, position.part);
    }

    private releaseMedia() {
        // 늦은 DOM 이벤트를 먼저 분리한다. 캐시에는 Blob만 보유하고 Object URL은 즉시 해제한다.
        if (this.audio) {
            this.audio.onplaying = null;
            this.audio.onpause = null;
            this.audio.onended = null;
            this.audio.onerror = null;
            this.audio.oncanplay = null;
            this.audio.ontimeupdate = null;
            this.audio.pause();
            this.audio.removeAttribute("src");
            this.audio.load();
            this.audio = null;
        }
        if (this.url) this.dependencies.revokeUrl(this.url);
        this.url = null;
    }

    private abortPending(except?: string) {
        for (const [key, value] of this.pending) {
            if (key === except) continue;
            value.controller.abort();
            this.pending.delete(key);
        }
    }

    stop() {
        this.reset();
    }

    private reset(sharedCurrentPart?: string) {
        this.intent = false;
        this.generation += 1;
        this.abortPending(sharedCurrentPart);
        this.releaseMedia();
        this.queue = [];
        this.awaitingMore = false;
        this.identity = "";
        this.endedAt = null;
        this.failedLookahead.clear();
        this.emit({ ...initialPlayback });
    }

    dispose() {
        this.stop();
        this.cache.clear();
    }

    start(queue: NovelSegment[], language: NovelLanguage, awaitingMore = false) {
        const identity = JSON.stringify([language, queue.map(item => [item.id, item.plainJa, language === "ja" ? null : novelTranslation(item, language)])]);
        // 동일 재생 의사의 연타는 현재 준비/재생을 공유한다. 새 범위나 언어만 세대를 교체한다.
        if (identity === this.identity && ["loading", "playing", "paused", "waiting"].includes(this.state.status)) {
            this.awaitingMore = awaitingMore;
            if (this.state.status === "paused") void this.resume();
            return;
        }
        // 새 범위도 같은 현재 part부터 시작하면 대기 중 합성을 공유한다. 과거 큐의 재생은 세대로 차단한다.
        const sharedCurrentPart = queue[0] ? audioKey(queue[0], language, 0) : undefined;
        this.reset(sharedCurrentPart);
        this.queue = queue;
        this.awaitingMore = awaitingMore;
        this.identity = identity;
        this.language = language;
        this.index = 0;
        this.part = 0;
        this.started = this.dependencies.now();
        this.intent = true;
        void this.load();
    }

    appendReady(queue: NovelSegment[], language: NovelLanguage, awaitingMore: boolean) {
        if (!this.identity || language !== this.language || queue.length < this.queue.length) return;
        // 기존 합성의 텍스트 hash/ID가 바뀌면 재생을 중단한다. 새 문장은 명시한 연속 읽기 의사에만 붙인다.
        if (this.queue.some((item, index) => item.id !== queue[index].id
                || item.plainJa !== queue[index].plainJa || (language !== "ja" && novelTranslation(item, language) !== novelTranslation(queue[index], language)))) {
            this.stop();
            return;
        }
        this.queue = queue;
        this.awaitingMore = awaitingMore;
        if (this.state.count !== queue.length) this.emit({ count: queue.length });
        if (this.state.status === "waiting" && this.intent) void this.load();
    }

    setRate(rate: number) {
        this.rate = Number.isFinite(rate) ? Math.max(0.5, Math.min(2, rate)) : 1;
        if (this.audio) this.audio.playbackRate = this.rate;
    }

    pause() {
        if ((!this.queue.length && this.state.status !== "waiting") || this.state.status === "ended") return;
        this.intent = false;
        this.abortPending();
        this.lookaheadAttempted = null;
        if (this.audio) this.audio.pause();
        else this.generation += 1;
        this.emit({ status: "paused", segmentId: null });
    }

    async resume() {
        if (this.state.status !== "paused") return;
        this.intent = true;
        if (!this.audio) { await this.load(); return; }
        const generation = this.generation;
        try {
            await this.audio.play();
        } catch {
            if (generation === this.generation) this.fail("PLAYBACK_BLOCKED");
        }
    }

    skip(delta: number) {
        const index = this.index + delta;
        if (index < 0 || index >= this.queue.length) return;
        this.index = index;
        this.part = 0;
        this.endedAt = null;
        if (this.intent) void this.load();
        else {
            this.generation += 1;
            this.abortPending();
            this.releaseMedia();
            this.emit({ index, segmentId: null });
        }
    }

    retry() {
        if (this.state.status !== "error") return;
        this.failedLookahead.delete(this.key({ index: this.index, part: this.part }));
        this.intent = true;
        void this.load();
    }

    private fail(error: string) {
        this.intent = false;
        this.abortPending();
        this.emit({ status: "error", segmentId: null, error });
    }

    private cached(key: string) {
        const item = this.cache.get(key);
        if (!item) return undefined;
        if (item.expires <= this.dependencies.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return item.value;
    }

    private obtain(position: Position): Promise<NovelAudioPart> {
        const key = this.key(position);
        const cached = this.cached(key);
        if (cached) return Promise.resolve(cached);
        const pending = this.pending.get(key);
        if (pending) return pending.promise;
        const controller = new AbortController();
        const promise = this.dependencies.fetchAudio(this.queue[position.index].id, this.language, position.part, controller.signal).then(value => {
            if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
            // 권한/회차/revision/정책 수명은 hook 인스턴스가 소유한다. 메모리는 TTL/개수/바이트 모두 제한한다.
            if (value.blob.size <= CACHE_BYTES) {
                this.cache.set(key, { value, expires: this.dependencies.now() + CACHE_TTL_MS });
                let bytes = [...this.cache.values()].reduce((sum, item) => sum + item.value.blob.size, 0);
                for (const [oldKey, item] of this.cache) {
                    if (this.cache.size <= 32 && bytes <= CACHE_BYTES) break;
                    this.cache.delete(oldKey);
                    bytes -= item.value.blob.size;
                }
            }
            return value;
        }).finally(() => {
            if (this.pending.get(key)?.controller === controller) this.pending.delete(key);
        });
        this.pending.set(key, { controller, promise });
        return promise;
    }

    private nextPosition(partCount: number): Position | null {
        if (this.part + 1 < partCount) return { index: this.index, part: this.part + 1 };
        return this.index + 1 < this.queue.length ? { index: this.index + 1, part: 0 } : null;
    }

    private prepareNext(audio: HTMLAudioElement, partCount: number) {
        // 합성 완료는 다음 합성의 트리거가 아니다. 전체/이어읽기의 실제 재생 끝3초 이내만 한 부분을 준비한다.
        if (!this.intent || this.state.status !== "playing" || this.queue.length <= 1
            || !Number.isFinite(audio.duration) || audio.duration <= 0 || audio.currentTime < Math.max(0, audio.duration - 3)) return;
        const next = this.nextPosition(partCount);
        if (!next) return;
        const key = this.key(next);
        if (this.lookaheadAttempted === key) return;
        this.lookaheadAttempted = key;
        const generation = this.generation;
        const preparation = this.obtain(next);
        const signal = this.pending.get(key)?.controller.signal;
        void preparation.catch(error => {
            // 준비 실패를 도달 시 자동 재전송하지 않는다. 현재 재생 뒤 오류를 표시하고 사용자가 재시도한다.
            if (generation === this.generation && this.intent && !signal?.aborted
                && !(error instanceof DOMException && error.name === "AbortError")) this.failedLookahead.add(key);
        });
    }

    private async load() {
        if (!this.intent) return;
        const generation = ++this.generation;
        this.releaseMedia();
        this.lookaheadAttempted = null;
        const segment = this.queue[this.index];
        if (!segment) {
            if (this.awaitingMore) {
                this.emit({ status: "waiting", segmentId: null });
                return;
            }
            this.intent = false;
            this.abortPending();
            this.emit({ status: "ended", segmentId: null });
            return;
        }
        const position = { index: this.index, part: this.part };
        const key = this.key(position);
        this.abortPending(key);
        const localCacheHit = !!this.cached(key);
        this.emit({ status: "loading", segmentId: null, index: this.index, count: this.queue.length, error: null });
        try {
            if (this.failedLookahead.has(key)) throw new Error("LOOKAHEAD_FAILED");
            const result = await this.obtain(position);
            if (generation !== this.generation || !this.intent) return;
            const responseAt = this.dependencies.now();
            if (this.state.firstAudioResponseMs === null) this.emit({ firstAudioResponseMs: responseAt - this.started,
                firstAudioHeadersMs: localCacheHit ? null : result.transport?.requestToHeadersMs ?? null, firstAudioCacheHit: localCacheHit || result.cacheHit === true });
            this.url = this.dependencies.createUrl(result.blob);
            const audio = this.dependencies.createAudio(this.url);
            this.audio = audio;
            audio.playbackRate = this.rate;
            const current = () => generation === this.generation;
            audio.oncanplay = () => {
                if (!current() || this.state.firstAudioPlayableMs !== null) return;
                // response→canplay는 디코드/버퍼 준비를 포함한다. 순수 decoder CPU나 provider TTFT로 해석하지 않는다.
                const ready = this.dependencies.now();
                this.emit({ firstAudioPlayableMs: ready - this.started, firstAudioDecodeMs: ready - responseAt });
            };
            audio.onplaying = () => {
                if (!current() || !this.intent) { audio.pause(); return; }
                const now = this.dependencies.now();
                this.emit({ status: "playing", segmentId: segment.id, firstAudioPlayingMs: this.state.firstAudioPlayingMs ?? now - this.started,
                    gapsMs: this.endedAt === null ? this.state.gapsMs : [...this.state.gapsMs, now - this.endedAt] });
                this.endedAt = null;
            };
            audio.onpause = () => {
                if (!current() || !this.intent || audio.ended) return;
                this.intent = false;
                this.abortPending();
                this.emit({ status: "paused", segmentId: null });
            };
            audio.onerror = () => { if (current()) this.fail("AUDIO_DECODE_FAILED"); };
            audio.ontimeupdate = () => { if (current()) this.prepareNext(audio, result.partCount); };
            audio.onended = () => {
                if (!current() || !this.intent) return;
                this.endedAt = this.dependencies.now();
                const next = this.nextPosition(result.partCount);
                this.index = next?.index ?? this.queue.length;
                this.part = next?.part ?? 0;
                void this.load();
            };
            await audio.play();
        } catch {
            if (generation === this.generation && this.intent) this.fail("AUDIO_REQUEST_OR_PLAYBACK_FAILED");
        }
    }
}
