import assert from "node:assert/strict";
import test from "node:test";

import { createLazyAudioResource } from "../../src/features/language-learning/common/lazyAudioResource.ts";

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function fixture(fetchBlob = async () => new Blob(["audio"])) {
    let requests = 0;
    const created = [];
    const revoked = [];
    const resource = createLazyAudioResource({
        fetchBlob: () => { requests += 1; return fetchBlob(); },
        createObjectURL: (blob) => { const url = `blob:test-${created.length}`; created.push({ url, blob }); return url; },
        revokeObjectURL: (url) => revoked.push(url),
    });
    return { resource, created, revoked, requests: () => requests };
}

test("audio resource creation and SSR snapshots are inert and stable", async () => {
    const f = fixture();
    assert.equal(f.resource.getSnapshot(), f.resource.getSnapshot());
    assert.equal(f.resource.getServerSnapshot(), f.resource.getServerSnapshot());
    await f.resource.load();
    assert.equal(f.requests(), 0);
    assert.deepEqual(f.created, []);
});

test("activated resource loads once and reuses its URL", async () => {
    const f = fixture();
    const dispose = f.resource.activate();
    await f.resource.load();
    assert.deepEqual(f.resource.getSnapshot(), { url: "blob:test-0", loading: false, failed: false });
    await f.resource.load();
    assert.equal(f.requests(), 1);
    dispose();
    assert.deepEqual(f.revoked, ["blob:test-0"]);
});

test("concurrent clicks share a pending audio request", async () => {
    const d = deferred();
    const f = fixture(() => d.promise);
    const dispose = f.resource.activate();
    const first = f.resource.load();
    const second = f.resource.load();
    assert.equal(first, second);
    assert.equal(f.resource.getSnapshot().loading, true);
    d.resolve(new Blob(["x"]));
    await first;
    assert.equal(f.requests(), 1);
    assert.equal(f.created.length, 1);
    dispose();
});

test("network failure is observable and retry succeeds without rejection", async () => {
    let fail = true;
    const f = fixture(async () => { if (fail) throw new Error("offline"); return new Blob(["ok"]); });
    const dispose = f.resource.activate();
    await assert.doesNotReject(f.resource.load());
    assert.deepEqual(f.resource.getSnapshot(), { url: null, loading: false, failed: true });
    fail = false;
    await f.resource.load();
    assert.equal(f.resource.getSnapshot().failed, false);
    assert.equal(f.requests(), 2);
    dispose();
});

test("synchronously throwing fetchers do not leave a stuck pending request", async () => {
    let fail = true;
    const f = fixture(() => { if (fail) throw new Error("sync"); return Promise.resolve(new Blob(["ok"])); });
    const dispose = f.resource.activate();
    await f.resource.load();
    assert.equal(f.resource.getSnapshot().failed, true);
    fail = false;
    await f.resource.load();
    assert.equal(f.resource.getSnapshot().url, "blob:test-0");
    dispose();
});

test("leaving before the microtask cancels a not-yet-started fetch", async () => {
    const f = fixture();
    const dispose = f.resource.activate();
    const loading = f.resource.load();
    dispose();
    await loading;
    assert.equal(f.requests(), 0);
    assert.deepEqual(f.created, []);
});

test("a late successful response after unmount never allocates an object URL", async () => {
    const d = deferred();
    const f = fixture(() => d.promise);
    const dispose = f.resource.activate();
    const loading = f.resource.load();
    await Promise.resolve();
    dispose();
    d.resolve(new Blob(["late"]));
    await loading;
    assert.equal(f.requests(), 1);
    assert.equal(f.created.length, 0);
    assert.deepEqual(f.resource.getSnapshot(), { url: null, loading: false, failed: false });
});

test("a late failure after disposal does not reintroduce an error state", async () => {
    const d = deferred();
    const f = fixture(() => d.promise);
    const dispose = f.resource.activate();
    const loading = f.resource.load();
    await Promise.resolve();
    dispose();
    d.reject(new Error("late failure"));
    await assert.doesNotReject(loading);
    assert.equal(f.resource.getSnapshot().failed, false);
});

test("effect cleanup and reactivation allow a fresh request, not the prior response", async () => {
    const first = deferred();
    const second = deferred();
    let count = 0;
    const f = fixture(() => ++count === 1 ? first.promise : second.promise);
    const disposeFirst = f.resource.activate();
    const oldRequest = f.resource.load();
    await Promise.resolve();
    disposeFirst();
    const disposeSecond = f.resource.activate();
    const newRequest = f.resource.load();
    await Promise.resolve();
    first.resolve(new Blob(["old"]));
    await oldRequest;
    assert.equal(f.resource.getSnapshot().loading, true);
    assert.equal(f.created.length, 0);
    second.resolve(new Blob(["new"]));
    await newRequest;
    assert.equal(await f.created[0].blob.text(), "new");
    disposeSecond();
});

test("disposing a loaded URL is idempotent", async () => {
    const f = fixture();
    const dispose = f.resource.activate();
    await f.resource.load();
    dispose();
    dispose();
    assert.deepEqual(f.revoked, ["blob:test-0"]);
    assert.equal(f.resource.getSnapshot().url, null);
});

test("URL allocation failures are handled like load failures", async () => {
    const resource = createLazyAudioResource({
        fetchBlob: async () => new Blob(["x"]),
        createObjectURL: () => { throw new Error("not supported"); },
        revokeObjectURL: () => {},
    });
    const dispose = resource.activate();
    await assert.doesNotReject(resource.load());
    assert.deepEqual(resource.getSnapshot(), { url: null, loading: false, failed: true });
    dispose();
});

test("subscribers observe transitions, and unsubscribe releases their listener", async () => {
    const f = fixture();
    const dispose = f.resource.activate();
    const seen = [];
    const unsubscribe = f.resource.subscribe(() => seen.push(f.resource.getSnapshot()));
    await f.resource.load();
    assert.equal(seen.length, 2);
    assert.equal(seen[0].loading, true);
    assert.equal(seen[1].url, "blob:test-0");
    unsubscribe();
    dispose();
    assert.equal(seen.length, 2);
});

test("separate resource identities do not share URLs or late responses", async () => {
    const old = deferred();
    const a = fixture(() => old.promise);
    const b = fixture();
    const disposeA = a.resource.activate();
    const requestA = a.resource.load();
    await Promise.resolve();
    disposeA();
    const disposeB = b.resource.activate();
    await b.resource.load();
    old.resolve(new Blob(["old identity"]));
    await requestA;
    assert.equal(a.created.length, 0);
    assert.equal(b.created.length, 1);
    disposeB();
});
