import assert from "node:assert/strict";
import test from "node:test";

import {
    MicrophoneAccessError,
    queryMicrophonePermission,
    requestMicrophoneStream,
} from "../../src/features/language-learning/speaking/recorder/mediaRecorderAdapter.ts";

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

function setNavigator(value) {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value });
}

test("pending microphone access times out without granting or leaking its late stream", async () => {
    const pending = deferred();
    let stopped = 0;
    globalThis.MediaRecorder = class {};
    setNavigator({ mediaDevices: { getUserMedia: () => pending.promise } });
    await assert.rejects(
        requestMicrophoneStream({ timeoutMs: 5 }),
        (error) => error instanceof MicrophoneAccessError && error.reason === "TIMED_OUT",
    );
    pending.resolve({ getTracks: () => [{ stop: () => { stopped++; } }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(stopped, 1);
});

test("cancelled access ignores and releases a late stream", async () => {
    const pending = deferred();
    let stopped = 0;
    globalThis.MediaRecorder = class {};
    setNavigator({ mediaDevices: { getUserMedia: () => pending.promise } });
    const controller = new AbortController();
    const result = requestMicrophoneStream({ signal: controller.signal });
    controller.abort();
    await assert.rejects(result, (error) => error.reason === "CANCELLED");
    pending.resolve({ getTracks: () => [{ stop: () => { stopped++; } }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(stopped, 1);
});

test("unanswered permissions query becomes unknown rather than denied", async () => {
    setNavigator({ permissions: { query: () => new Promise(() => {}) } });
    assert.equal(await queryMicrophonePermission(5), null);
});
