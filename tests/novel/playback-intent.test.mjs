import assert from "node:assert/strict";
import test from "node:test";
import { NovelPlayback } from "../../src/features/novel/playback.ts";

const flush = () => new Promise(resolve => setImmediate(resolve));
const piece = { blob: new Blob(["wav"]), partCount: 1 };
const sentence = id => ({ id, plainJa: `${id}。`, ko: `${id}다.` });
function harness(fetchAudio, options = {}) {
    const calls = [], audios = [], states = [];
    let clock = 0;
    const player = new NovelPlayback({
        fetchAudio: (id, language, index, signal) => { calls.push({ id, language, index, signal }); return fetchAudio(id, index, signal); },
        now: () => ++clock, createUrl: () => `blob:${audios.length}`, revokeUrl() {},
        onChange: state => states.push(state), createAudio: () => {
            const audio = { duration: 10, currentTime: 0, play: async () => { if (options.blocked) throw new Error("NotAllowedError"); audio.onplaying?.(); }, pause: () => audio.onpause?.(), load() {}, removeAttribute() {} };
            audios.push(audio);
            return audio;
        },
    });
    return { player, calls, audios, states };
}

test("identical clicks share the pending operation and completed audio cache", async () => {
    // 준비: 아직 도착하지 않은 동일 문장 응답이다.
    let deliver;
    const h = harness(() => new Promise(resolve => { deliver = resolve; }));
    const queue = [sentence("a")];
    // 실행: 연타는 새 합성을 시작하지 않는다.
    h.player.start(queue, "ko");
    h.player.start(queue, "ko");
    assert.equal(h.calls.length, 1);
    deliver(piece);
    await flush();
    h.audios[0].onended();
    await flush();
    h.player.start(queue, "ko");
    await flush();
    // 검증: 같은 음성 재생도 네트워크 호출이 늘지 않는다.
    assert.equal(h.calls.length, 1);
    assert.equal(h.audios.length, 2);
});

test("changing reading range shares the same pending current audio part", async () => {
    // 준비: 같은 첫 문장의 단일 읽기가 아직 합성 응답을 기다리고 있다.
    let deliver;
    const h = harness(() => new Promise(resolve => { deliver = resolve; }));
    h.player.start([sentence("a")], "ko");

    // 실행: 사용자가 전체 읽기로 범위를 바꿔도 같은 현재 part는 공유한다.
    h.player.start([sentence("a"), sentence("b")], "ko");
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].signal.aborted, false);
    deliver(piece);
    await flush();

    // 검증: 옛 단일 큐는 늦게 재생되지 않으며 새 큐 하나만 활성화된다.
    assert.equal(h.audios.length, 1);
    assert.equal(h.states.at(-1).count, 2);
    assert.equal(h.states.at(-1).segmentId, "a");
    h.player.dispose();
});

test("pause while preparing aborts and fences a late response", async () => {
    // 준비 / 실행
    let deliver;
    const h = harness(() => new Promise(resolve => { deliver = resolve; }));
    h.player.start([sentence("a"), sentence("b")], "ja");
    h.player.pause();
    deliver(piece);
    await flush();
    // 검증: 이미 보낸 요청의 청구 취소를 가정하지 않고 소비/재생만 차단한다.
    assert.equal(h.calls[0].signal.aborted, true);
    assert.equal(h.audios.length, 0);
    assert.equal(h.states.at(-1).status, "paused");
    assert.equal(h.calls.length, 1);
});

test("lookahead uses the playing position and stays at one next part", async () => {
    // 준비 / 실행
    const h = harness(async () => piece);
    h.player.start([sentence("a"), sentence("b"), sentence("c")], "ja");
    await flush();
    assert.equal(h.calls.length, 1);
    h.audios[0].currentTime = 8;
    h.audios[0].ontimeupdate?.();
    await flush();
    // 검증: 다음 응답 도착이나 반복 timeupdate로 세 번째를 생성하지 않는다.
    assert.deepEqual(h.calls.map(item => item.id), ["a", "b"]);
    h.audios[0].ontimeupdate?.();
    await flush();
    assert.equal(h.calls.length, 2);
    h.player.pause();
    h.audios[0].ontimeupdate?.();
    h.audios[0].onended?.();
    await flush();
    assert.equal(h.calls.length, 2);
    assert.equal(h.states.at(-1).status, "paused");
});

test("requested progressive reading waits at the frontier and resumes only while intent remains", async () => {
    const h = harness(async () => piece);
    h.player.start([sentence("a")], "ko", true);
    await flush();
    h.audios[0].onended();
    await flush();
    assert.equal(h.states.at(-1).status, "waiting");
    assert.deepEqual(h.calls.map(item => item.id), ["a"]);
    h.player.appendReady([sentence("a"), sentence("b")], "ko", true);
    await flush();
    assert.deepEqual(h.calls.map(item => item.id), ["a", "b"]);
    h.player.pause();
    h.player.appendReady([sentence("a"), sentence("b"), sentence("c")], "ko", true);
    await flush();
    assert.deepEqual(h.calls.map(item => item.id), ["a", "b"]);
    h.player.stop();
    h.player.appendReady([sentence("a"), sentence("b"), sentence("c"), sentence("d")], "ko", true);
    await flush();
    assert.deepEqual(h.calls.map(item => item.id), ["a", "b"]);
});

test("본문 gap에서 시작한 명시 이어읽기도 대기하고 pause/stop 후 복구는 합성하지 않는다", async () => {
    // 준비 / 실행: 현재 KO가 없는 위치의 재생 의사만 등록하며 합성은0회다.
    const h = harness(async () => piece);
    h.player.start([], "ko", true);
    assert.equal(h.states.at(-1).status, "waiting");
    assert.equal(h.calls.length, 0);
    h.player.pause();
    h.player.appendReady([sentence("a")], "ko", false);
    await flush();
    // 검증: 복구 이벤트는 pause를 뒤집지 않으며 명시 resume에서만 시작한다.
    assert.equal(h.calls.length, 0);
    await h.player.resume();
    await flush();
    assert.equal(h.calls.length, 1);
    h.player.stop();
    h.player.appendReady([sentence("a"), sentence("b")], "ko", false);
    await flush();
    assert.equal(h.calls.length, 1);
});

test("일본어 본문 낭독은 한국어 복구 도착으로 정상 오디오를 폐기하지 않는다", async () => {
    // 준비 / 실행 / 검증: 사용 중인 JA 원문은 동일하고 KO만 새로 채워졌다.
    const h = harness(async () => piece);
    h.player.start([{ ...sentence("a"), ko: null }, sentence("b")], "ja");
    await flush();
    h.player.appendReady([sentence("a"), sentence("b")], "ja", false);
    assert.equal(h.states.at(-1).status, "playing");
    assert.equal(h.calls.length, 1);
    h.player.stop();
});

test("single sentence, stopped queue and paused skip never synthesize ahead", async () => {
    // 준비 / 실행
    const h = harness(async () => ({ ...piece, partCount: 2 }));
    h.player.start([sentence("a")], "ko");
    await flush();
    h.audios[0].currentTime = 9;
    h.audios[0].ontimeupdate?.();
    await flush();
    assert.equal(h.calls.length, 1);
    h.player.stop();
    h.player.start([sentence("a"), sentence("b")], "ko");
    await flush();
    h.player.pause();
    const before = h.calls.length;
    h.player.skip(1);
    await flush();
    // 검증: 일시정지 상태의 위치 이동은 재개 의사가 아니다.
    assert.equal(h.calls.length, before);
    assert.equal(h.states.at(-1).status, "paused");
    h.player.stop();
});

test("audio cache separates language and changed translation text", async () => {
    // 준비 / 실행
    const h = harness(async () => piece);
    h.player.start([sentence("a")], "ja");
    await flush();
    h.player.start([sentence("a")], "ko");
    await flush();
    h.player.start([{ ...sentence("a"), ko: "수정된 문장." }], "ko");
    await flush();
    // 검증
    assert.equal(h.calls.length, 3);
    h.player.stop();
});

test("failed lookahead is not automatically retried at the next sentence", async () => {
    // 준비
    const h = harness(async id => { if (id === "b") throw new Error("busy"); return piece; });
    h.player.start([sentence("a"), sentence("b")], "ja");
    await flush();
    // 실행: 재생 위치에서 다음 부분 준비가 실패했다.
    h.audios[0].currentTime = 8;
    h.audios[0].ontimeupdate();
    await flush();
    h.audios[0].onended();
    await flush();
    // 검증: 도달 이벤트로 유료 요청을 자동 재전송하지 않는다.
    assert.deepEqual(h.calls.map(item => item.id), ["a", "b"]);
    assert.equal(h.states.at(-1).status, "error");
    h.player.retry();
    await flush();
    assert.equal(h.calls.length, 3);
});

test("autoplay rejection blocks all later lookahead and actual-playing metrics", async () => {
    // 준비
    const h = harness(async () => piece, { blocked: true });
    h.player.start([sentence("a"), sentence("b")], "ja");
    await flush();
    // 실행 / 검증: 브라우저 play 거절은 다음 합성을 시작하거나 재생 시각을 기록하지 않는다.
    h.audios[0].currentTime = 9;
    h.audios[0].ontimeupdate?.();
    await flush();
    assert.equal(h.states.at(-1).firstAudioPlayingMs, null);
    assert.equal(h.states.at(-1).status, "error");
    assert.equal(h.calls.length, 1);
    h.player.dispose();
    assert.equal(h.states.at(-1).status, "idle");
});
