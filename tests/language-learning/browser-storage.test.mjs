import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
    createBrowserStorageStore,
    getServerStorageSnapshot,
} from "../../src/features/language-learning/common/browserStorageStore.ts";
import { resolveDisclosureState } from "../../src/features/language-learning/common/disclosureState.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let values;
let storage;
let denyRead;
let denyWrite;

beforeEach(() => {
    values = new Map();
    denyRead = false;
    denyWrite = false;
    storage = {
        getItem(key) {
            if (denyRead) throw new Error("Storage unavailable");
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            if (denyWrite) throw new Error("Quota exceeded");
            values.set(key, value);
        },
        removeItem(key) {
            if (denyWrite) throw new Error("Storage unavailable");
            values.delete(key);
        },
    };
    const browser = new EventTarget();
    browser.localStorage = storage;
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
});

afterEach(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;
});

function externalChange(key, storageArea = storage) {
    const event = new Event("storage");
    Object.defineProperties(event, {
        key: { value: key },
        storageArea: { value: storageArea },
    });
    window.dispatchEvent(event);
}

test("SSR creates no browser state and uses a null hydration snapshot", () => {
    delete globalThis.window;
    const store = createBrowserStorageStore("note:1");
    assert.equal(store.getSnapshot(), null);
    assert.equal(getServerStorageSnapshot(), null);
    assert.doesNotThrow(() => store.setValue("ignored"));
    assert.doesNotThrow(() => store.subscribe(() => {})());
});

test("reading an existing note never overwrites or clears it on mount", () => {
    values.set("note:1", "既存のメモ");
    const store = createBrowserStorageStore("note:1");
    store.subscribe(() => {});
    assert.equal(store.getSnapshot(), "既存のメモ");
    assert.equal(store.getSnapshot(), "既存のメモ");
    assert.equal(values.get("note:1"), "既存のメモ");
});

test("writes persist immediately and notify this document", () => {
    const store = createBrowserStorageStore("note:1");
    let changes = 0;
    store.subscribe(() => { changes += 1; });
    store.setValue("メモ");
    assert.equal(values.get("note:1"), "メモ");
    assert.equal(store.getSnapshot(), "メモ");
    assert.equal(changes, 1);
});

test("no-op updates do not notify subscribers", () => {
    values.set("note:1", "same");
    const store = createBrowserStorageStore("note:1");
    let changes = 0;
    store.subscribe(() => { changes += 1; });
    store.setValue("same");
    store.setValue((current) => current);
    assert.equal(changes, 0);
});

test("functional updates see the most recent stored value", () => {
    const store = createBrowserStorageStore("note:1");
    store.setValue("A");
    store.setValue((current) => `${current}B`);
    store.setValue((current) => `${current}C`);
    assert.equal(store.getSnapshot(), "ABC");
});

test("two consumers of a key receive same-document updates", () => {
    const first = createBrowserStorageStore("note:1");
    const second = createBrowserStorageStore("note:1");
    let observed = null;
    first.subscribe(() => {});
    second.subscribe(() => { observed = second.getSnapshot(); });
    first.setValue("shared");
    assert.equal(observed, "shared");
    second.setValue((current) => `${current}!`);
    assert.equal(first.getSnapshot(), "shared!");
});

test("different sessions never share notes", () => {
    const first = createBrowserStorageStore("note:1");
    const second = createBrowserStorageStore("note:2");
    let changes = 0;
    second.subscribe(() => { changes += 1; });
    first.setValue("first only");
    assert.equal(second.getSnapshot(), null);
    assert.equal(changes, 0);
});

test("a newly selected storage key reads its own saved value", () => {
    values.set("note:1", "one");
    values.set("note:2", "two");
    const old = createBrowserStorageStore("note:1");
    old.setValue("edited one");
    const next = createBrowserStorageStore("note:2");
    assert.equal(next.getSnapshot(), "two");
    assert.equal(values.get("note:2"), "two");
});

test("clearing a note removes its key and notifies subscribers", () => {
    values.set("note:1", "text");
    const store = createBrowserStorageStore("note:1");
    let observed = "text";
    store.subscribe(() => { observed = store.getSnapshot(); });
    store.setValue(null);
    assert.equal(values.has("note:1"), false);
    assert.equal(observed, null);
});

test("whitespace is preserved during editing", () => {
    const store = createBrowserStorageStore("note:1");
    store.setValue("  ");
    assert.equal(store.getSnapshot(), "  ");
    store.setValue("  メモ\n");
    assert.equal(store.getSnapshot(), "  メモ\n");
});

test("unsubscribing removes both native and local listeners", () => {
    const store = createBrowserStorageStore("note:1");
    let changes = 0;
    const stop = store.subscribe(() => { changes += 1; });
    stop();
    store.setValue("new");
    externalChange("note:1");
    assert.equal(changes, 0);
});

test("a failed write retains the edited value, even over an old saved value", () => {
    values.set("note:1", "old");
    denyWrite = true;
    const store = createBrowserStorageStore("note:1");
    store.subscribe(() => {});
    store.setValue("edited");
    assert.equal(store.getSnapshot(), "edited");
    assert.equal(values.get("note:1"), "old");
    store.setValue((current) => `${current}!`);
    assert.equal(store.getSnapshot(), "edited!");
});

test("failed writes also reach other mounted consumers", () => {
    denyWrite = true;
    const first = createBrowserStorageStore("note:1");
    const second = createBrowserStorageStore("note:1");
    first.subscribe(() => {});
    second.subscribe(() => {});
    first.setValue("memory only");
    assert.equal(second.getSnapshot(), "memory only");
});

test("read and write failures still allow in-memory editing", () => {
    denyRead = true;
    denyWrite = true;
    const store = createBrowserStorageStore("note:1");
    store.subscribe(() => {});
    assert.equal(store.getSnapshot(), null);
    store.setValue("available in this view");
    assert.equal(store.getSnapshot(), "available in this view");
});

test("an inaccessible localStorage property is safely handled", () => {
    Object.defineProperty(window, "localStorage", {
        get() { throw new Error("SecurityError"); },
    });
    const store = createBrowserStorageStore("note:1");
    store.subscribe(() => {});
    assert.equal(store.getSnapshot(), null);
    store.setValue("still editable");
    assert.equal(store.getSnapshot(), "still editable");
});

test("failed removal shows an empty note without restoring the old text", () => {
    values.set("note:1", "old");
    denyWrite = true;
    const store = createBrowserStorageStore("note:1");
    store.subscribe(() => {});
    store.setValue(null);
    assert.equal(store.getSnapshot(), null);
    assert.equal(values.get("note:1"), "old");
});

test("a later successful write recovers from in-memory fallback", () => {
    denyWrite = true;
    const store = createBrowserStorageStore("note:1");
    store.subscribe(() => {});
    store.setValue("memory");
    denyWrite = false;
    store.setValue("persisted");
    assert.equal(createBrowserStorageStore("note:1").getSnapshot(), "persisted");
});

test("native storage changes refresh the matching key", () => {
    const store = createBrowserStorageStore("note:1");
    let observed = null;
    store.subscribe(() => { observed = store.getSnapshot(); });
    values.set("note:1", "other tab");
    externalChange("note:1");
    assert.equal(observed, "other tab");
});

test("native storage clear refreshes all subscribed keys", () => {
    const store = createBrowserStorageStore("note:1");
    let changes = 0;
    store.subscribe(() => { changes += 1; });
    store.setValue("value");
    values.clear();
    externalChange(null);
    assert.equal(store.getSnapshot(), null);
    assert.equal(changes, 2);
});

test("native events for unrelated keys or sessionStorage are ignored", () => {
    const store = createBrowserStorageStore("note:1");
    let changes = 0;
    store.subscribe(() => { changes += 1; });
    externalChange("note:2");
    externalChange("note:1", {});
    assert.equal(changes, 0);
});

test("disabled storage never reads or writes a session key", () => {
    const store = createBrowserStorageStore(null);
    store.subscribe(() => assert.fail("disabled store notification"));
    store.setValue("not stored");
    assert.equal(store.getSnapshot(), null);
    assert.equal(values.size, 0);
});

test("malformed custom events cannot replace a string snapshot", () => {
    const store = createBrowserStorageStore("note:1");
    let changes = 0;
    store.subscribe(() => { changes += 1; });
    window.dispatchEvent(new CustomEvent("translacat:language-learning:storage-change", {
        detail: { key: "note:1", value: {}, persisted: false },
    }));
    assert.equal(store.getSnapshot(), null);
    assert.equal(changes, 0);
});

test("disclosure uses the selected viewport defaults when storage is empty", () => {
    assert.deepEqual(resolveDisclosureState({ overview: true, profile: false }, null), {
        overview: true, profile: false,
    });
});

test("disclosure restores only known boolean keys and preserves missing defaults", () => {
    assert.deepEqual(resolveDisclosureState({ overview: true, profile: false },
        '{"overview":false,"profile":"true","unknown":true}'), {
        overview: false, profile: false,
    });
});

test("malformed, null, primitive, and array JSON all use safe defaults", () => {
    for (const raw of ["{bad", "null", "true", "3", '"text"', "[]", '[{"overview":false}]']) {
        assert.deepEqual(resolveDisclosureState({ overview: true }, raw), { overview: true });
    }
});

test("disclosure does not mutate the defaults or share state between callers", () => {
    const defaults = Object.freeze({ overview: true, profile: false });
    const first = resolveDisclosureState(defaults, '{"overview":false}');
    const second = resolveDisclosureState(defaults, null);
    first.profile = true;
    assert.deepEqual(second, { overview: true, profile: false });
    assert.deepEqual(defaults, { overview: true, profile: false });
});

test("back-to-back disclosure updates preserve the latest saved state", () => {
    const store = createBrowserStorageStore("disclosure");
    const defaults = { overview: true, profile: false };
    const toggle = (key) => store.setValue((raw) => {
        const current = resolveDisclosureState(defaults, raw);
        return JSON.stringify({ ...current, [key]: !current[key] });
    });
    toggle("overview");
    toggle("profile");
    assert.deepEqual(resolveDisclosureState(defaults, store.getSnapshot()), {
        overview: false, profile: true,
    });
});
