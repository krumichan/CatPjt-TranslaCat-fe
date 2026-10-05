import assert from "node:assert/strict";
import test from "node:test";
import { NovelPlayback } from "../../src/features/novel/playback.ts";

function harness(fetchAudio) {
    const audios = [], states = [], revoked = [];
    const player = new NovelPlayback({ fetchAudio, now: () => 1, createUrl: () => `blob:${audios.length}`, revokeUrl: url => revoked.push(url), onChange: state => states.push(state), createAudio: () => {
        const audio = { play: async () => { audio.onplaying?.(); }, pause: () => audio.onpause?.(), load() {}, removeAttribute() {} };
        audios.push(audio);
        return audio;
    } });
    return { player, audios, states, revoked };
}
const part = { blob: new Blob(["wav"]), partCount: 1 };
const flush = () => new Promise(resolve => setImmediate(resolve));

test("late cancelled audio cannot replace a new single-sentence queue", async () => {
    // 준비
    let release;
    const h = harness(id => id === "a" ? new Promise(resolve => { release = resolve; }) : Promise.resolve(part));
    // 실행
    h.player.start([{ id: "a" }, { id: "b" }], "ko");
    h.player.start([{ id: "b" }], "ko");
    await flush();
    release(part);
    await flush();
    // 검증
    assert.equal(h.audios.length, 1);
    assert.equal(h.states.at(-1).segmentId, "b");
    h.audios[0].onended();
    await flush();
    assert.equal(h.states.at(-1).status, "ended");
    assert.equal(h.revoked.length, 1);
});

test("actual playback events, pause/resume, multipart ordering and cleanup", async () => {
    // 준비
    const calls = [];
    const h = harness(async (id, language, index) => { calls.push([id, index]); return { ...part, partCount: id === "a" ? 2 : 1 }; });
    // 실행
    h.player.start([{ id: "a" }, { id: "b" }], "ja");
    await flush();
    h.player.pause();
    assert.equal(h.states.at(-1).status, "paused");
    await h.player.resume();
    h.player.setRate(1.5);
    assert.equal(h.audios[0].playbackRate, 1.5);
    h.audios[0].onended();
    await flush();
    h.audios[1].onended();
    await flush();
    h.player.stop();
    // 검증
    assert.deepEqual(calls, [["a", 0], ["a", 1], ["b", 0]]);
    assert.equal(h.revoked.length, 3);
    assert.equal(h.audios[2].onended, null);
});

test("network failure waits for manual retry without an onended loop", async () => {
    // 준비
    let calls = 0;
    const h = harness(async () => { calls++; throw new Error("offline"); });
    // 실행
    h.player.start([{ id: "a" }], "ko");
    await flush();
    // 검증
    assert.equal(calls, 1);
    assert.equal(h.states.at(-1).status, "error");
    h.player.retry();
    await flush();
    assert.equal(calls, 2);
});
